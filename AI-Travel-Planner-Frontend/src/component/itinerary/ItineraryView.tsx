import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import { useReactToPrint } from 'react-to-print'
import type { ItineraryData, BestFlightOption } from '../../types/trave'
import { formatDuration, formatDateTime, getDayOffsetSuffix } from '../../utils/dateUtils'

// Component to update map center when data changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

// Component to remove zoom controls
function RemoveZoomControl() {
  const map = useMap()
  useEffect(() => {
    if (map.zoomControl) {
      map.zoomControl.remove()
    }
    // Also hide via CSS as backup
    const style = document.createElement('style')
    style.textContent = '.leaflet-control-zoom { display: none !important; }'
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [map])
  return null
}

interface ItineraryViewProps {
  itinerary: ItineraryData
  isRightPanelExpanded: boolean
}

function ItineraryView({ itinerary, isRightPanelExpanded }: ItineraryViewProps) {
  const [expandedBest, setExpandedBest] = useState<Record<number, boolean>>({})
  const [showAllFlights, setShowAllFlights] = useState(false)
  const [extraActivities, setExtraActivities] = useState<Record<number, string[]>>({})
  const [newActivityInput, setNewActivityInput] = useState<Record<number, string>>({})
  const [showActivityInput, setShowActivityInput] = useState<Record<number, boolean>>({})
  const itineraryRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: itineraryRef,
    documentTitle: `Trip to ${itinerary.destination}`,
    
  })

  // Handle adding extra activity
  const handleAddActivity = (dayIndex: number) => {
    const activity = newActivityInput[dayIndex]?.trim()
    if (activity) {
      setExtraActivities(prev => ({
        ...prev,
        [dayIndex]: [...(prev[dayIndex] || []), activity]
      }))
      setNewActivityInput(prev => ({ ...prev, [dayIndex]: '' }))
      setShowActivityInput(prev => ({ ...prev, [dayIndex]: false }))
    }
  }

  // Function to render markdown description with enhanced formatting (for structured itinerary)
  const renderItineraryMarkdown = (text: string) => {
    if (!text || typeof text !== 'string') return null
    
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let currentList: React.ReactNode[] = []
    let isFirstLine = true
    
    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-outside mb-2 ml-5 space-y-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-gray-700 leading-relaxed pl-1 text-sm">{item}</li>
            ))}
          </ul>
        )
        currentList = []
      }
    }
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      if (!trimmedLine) {
        flushList()
        isFirstLine = false
        return
      }
      
      if (trimmedLine.startsWith('## ')) {
        flushList()
        const content = trimmedLine.substring(3).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        elements.push(
          <h2 key={`h2-${index}`} className="text-lg font-bold text-gray-900 mt-3 mb-2">
            {content}
          </h2>
        )
        isFirstLine = false
        return
      }
      
      if (trimmedLine.startsWith('### ')) {
        flushList()
        const content = trimmedLine.substring(4).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        elements.push(
          <h3 key={`h3-${index}`} className="text-base font-semibold text-gray-800 mt-3 mb-2">
            {content}
          </h3>
        )
        isFirstLine = false
        return
      }
      
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const content = trimmedLine.substring(2).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        currentList.push(content)
        isFirstLine = false
        return
      }
      
        // Check for special patterns like "Hotel Recommendation:", "Restaurant Suggestion:", "Travel Tip:"
      if (trimmedLine.includes('Hotel Recommendation:') || trimmedLine.includes('Restaurant Suggestion:') || trimmedLine.includes('Travel Tip:')) {
        flushList()
        const cleanedLine = trimmedLine.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        const parts = cleanedLine.split(':')
        const label = parts[0] + ':'
        const value = parts.slice(1).join(':').trim()
        
        let bgColor = 'bg-blue-50'
        let borderColor = 'border-blue-200'
        let textColor = 'text-blue-800'
        
        if (trimmedLine.includes('Hotel')) {
          bgColor = 'bg-purple-50'
          borderColor = 'border-purple-200'
          textColor = 'text-purple-800'
        } else if (trimmedLine.includes('Restaurant')) {
          bgColor = 'bg-orange-50'
          borderColor = 'border-orange-200'
          textColor = 'text-orange-800'
        } else if (trimmedLine.includes('Travel Tip')) {
          bgColor = 'bg-green-50'
          borderColor = 'border-green-200'
          textColor = 'text-green-800'
        }
        
        elements.push(
          <div key={`info-${index}`} className={`${bgColor} rounded-lg p-2 mb-2 border-l-4 ${borderColor}`}>
            <p className={`font-semibold ${textColor} mb-0.5 text-sm`}>{label}</p>
            <p className="text-gray-700 text-sm">{value}</p>
          </div>
        )
        isFirstLine = false
        return
      }
      
      flushList()
      if (trimmedLine) {
        // Special handling for the first line of description (before list items start)
        if (isFirstLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
          // First line that's not a list item - make it bold and bigger with blue color
          const cleanedLine = trimmedLine.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
          elements.push(
            <p key={`p-${index}`} className="mb-3 text-gray-700 leading-relaxed">
              <span className="text-lg font-bold text-blue-600">{cleanedLine}</span>
            </p>
          )
        } else {
          // Check if line contains " - " pattern and format the first part
          const dashIndex = trimmedLine.indexOf(' - ')
          if (dashIndex > 0) {
            const firstPart = trimmedLine.substring(0, dashIndex).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
            const restPart = trimmedLine.substring(dashIndex + 3).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
            elements.push(
              <p key={`p-${index}`} className="mb-2 text-gray-700 leading-relaxed text-sm">
                <span className="text-base font-bold text-blue-600">{firstPart}</span>
                {restPart && <span> - {restPart}</span>}
              </p>
            )
          } else {
            const cleanedLine = trimmedLine.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
            elements.push(
              <p key={`p-${index}`} className="mb-2 text-gray-700 leading-relaxed text-sm">
                {cleanedLine}
              </p>
            )
          }
        }
        isFirstLine = false
      }
    })
    
    flushList()
    return <div>{elements}</div>
  }

  const getFlightUrl = (option: BestFlightOption) => {
    const baseUrl = itinerary.flights?.search_metadata?.google_flights_url || '';
    if (!baseUrl) return null;
    
    if (option.departure_token) {
      try {
        const url = new URL(baseUrl);
        url.searchParams.set('tfu', option.departure_token);
        return url.toString();
      } catch (e) {
        if (baseUrl.includes('tfu=')) {
          return baseUrl.replace(/tfu=[^&]*/, `tfu=${encodeURIComponent(option.departure_token)}`);
        } else {
          return `${baseUrl}&tfu=${encodeURIComponent(option.departure_token)}`;
        }
      }
    }
    return baseUrl;
  };

  const toggleExpandedBest = (idx: number) => {
    setExpandedBest((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderBestFlightRow = (option: BestFlightOption, idx: number) => {
    if (!option.flights?.length) {
      return null;
    }

    const firstLeg = option.flights[0];
    const lastLeg = option.flights[option.flights.length - 1];
    const departureInfo = formatDateTime(firstLeg.departure_airport.time);
    const arrivalInfo = formatDateTime(lastLeg.arrival_airport.time);
    const dayOffset = getDayOffsetSuffix(firstLeg.departure_airport, lastLeg.arrival_airport);
    const timeLabel = `${departureInfo.time} – ${arrivalInfo.time}${dayOffset}`;
    const routeLabel = `${firstLeg.departure_airport.id}–${lastLeg.arrival_airport.id}`;

    const stopsCount = option.layovers?.length ?? Math.max(option.flights.length - 1, 0);
    const stopsLabel = stopsCount === 0 ? "Nonstop" : `${stopsCount} stop${stopsCount > 1 ? "s" : ""}`;
    const primaryLayover = option.layovers && option.layovers.length > 0 ? option.layovers[0] : null;
    const hasOvernightLayover = option.layovers?.some((layover) => layover.overnight) ?? false;
    const primaryAirline = firstLeg.airline;

    const isExpanded = !!expandedBest[idx];
    const headerGridTemplate = "auto minmax(80px, 1fr) 70px 70px auto auto";

    const expandedContainerStyle = {
      maxHeight: isExpanded ? "1600px" : "0px",
      opacity: isExpanded ? 1 : 0,
      overflow: "hidden" as const,
      transition: "max-height 0.2s ease, opacity 0.2s ease",
      background: "#fff",
    };

    const expandedInnerStyle = isExpanded
      ? {
          padding: "0 16px 16px 16px",
          transform: "translateY(0)",
          opacity: 1,
          visibility: "visible" as const,
          transition: "transform 0.5s ease, opacity 0.3s ease 0.1s, visibility 0s linear 0s",
          pointerEvents: "auto" as const,
        }
      : {
          padding: "0 16px",
          transform: "translateY(-8px)",
          opacity: 0,
          visibility: "hidden" as const,
          transition: "transform 0.5s ease, opacity 0.25s ease 0.5s, visibility 0s linear 0.5s",
          pointerEvents: "none" as const,
        };

    return (
      <div
        key={idx}
        className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
        style={{
          borderColor: expandedBest[idx] ? "#3b82f6" : undefined,
          boxShadow: expandedBest[idx] ? "0 4px 12px rgba(59, 130, 246, 0.15)" : undefined,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: headerGridTemplate,
            alignItems: "center",
            gap: "10px",
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backgroundColor: expandedBest[idx] ? "#f0f7ff" : "#fff",
          }}
          onClick={() => toggleExpandedBest(idx)}
          onMouseEnter={(e) => {
            if (!expandedBest[idx]) {
              e.currentTarget.style.backgroundColor = "#f8fafc";
            }
          }}
          onMouseLeave={(e) => {
            if (!expandedBest[idx]) {
              e.currentTarget.style.backgroundColor = "#fff";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            {option.airline_logo && (
              <img
                src={option.airline_logo}
                alt={primaryAirline || "airline"}
                style={{ width: "28px", height: "28px", objectFit: "contain", flexShrink: 0 }}
                referrerPolicy="no-referrer"
              />
            )}
            <div style={{ display: "grid", gap: "2px", minWidth: 0, overflow: "hidden" }}>
              <div style={{ color: "#202124", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {timeLabel}
              </div>
              {primaryAirline && (
                <div style={{ color: "#5f6368", fontSize: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {primaryAirline}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gap: "2px", textAlign: "center", justifySelf: "center", minWidth: 0 }}>
            <div style={{ color: "#202124", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap" }}>{formatDuration(option.total_duration)}</div>
            <div style={{ color: "#5f6368", fontSize: "9px", whiteSpace: "nowrap" }}>{routeLabel}</div>
          </div>
          <div style={{ display: "grid", gap: "2px", minWidth: 0, overflow: "hidden" }}>
            <div style={{ color: hasOvernightLayover ? "#d93025" : "#202124", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {stopsLabel}
              {hasOvernightLayover && <span style={{ marginLeft: "2px" }}>⚠</span>}
            </div>
            {stopsCount > 0 && primaryLayover && (
              <div style={{ color: "#5f6368", fontSize: "9px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {formatDuration(primaryLayover.duration)} · {primaryLayover.name}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", minWidth: 0 }}>
            <div style={{ color: "#188038", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
              {option.price != null ? `$${option.price}` : "N/A"}
            </div>
            <div style={{ color: "#5f6368", fontSize: "9px", whiteSpace: "nowrap" }}>round trip</div>
          </div>
          {getFlightUrl(option) && (
            <div style={{ display: "flex", alignItems: "center", justifySelf: "end", flexShrink: 0 }}>
              <a
                href={getFlightUrl(option) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-[10px] hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
                style={{
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Select
              </a>
            </div>
          )}
          <div
            style={{
              transform: expandedBest[idx] ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: "#5f6368",
              fontSize: "11px",
              lineHeight: 1,
              cursor: "pointer",
              justifySelf: "end",
              flexShrink: 0,
            }}
          >
            ▼
          </div>
        </div>

        <div style={expandedContainerStyle} aria-hidden={!expandedBest[idx]}>
          <div style={expandedInnerStyle}>
            <div style={{ position: "relative" }}>
              {option.flights.map((leg, legIdx) => {
                const dep = formatDateTime(leg.departure_airport.time);
                const arr = formatDateTime(leg.arrival_airport.time);
                const legDayOffset = getDayOffsetSuffix(leg.departure_airport, leg.arrival_airport);
                const legroomExt = leg.extensions?.find((e) => e.includes("legroom") || e.includes("Legroom"));
                const powerExt = leg.extensions?.find((e) => e.includes("power") || e.includes("USB") || e.includes("outlet"));
                const entertainmentExt = leg.extensions?.find((e) => e.includes("video") || e.includes("entertainment") || e.includes("media"));
                const layover = option.layovers?.[legIdx] || null;

                return (
                  <div key={legIdx}>
                    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 240px", gap: "24px", padding: "20px 0", position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minHeight: "120px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #1a73e8", background: "#fff", zIndex: 2, position: "relative", flexShrink: 0 }} />
                        <div style={{ flexGrow: 1, minHeight: "80px", borderLeft: "2px dotted #dadce0", width: "0px", margin: "4px 0" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #1a73e8", background: "#fff", zIndex: 2, position: "relative", flexShrink: 0 }} />
                      </div>
                      <div>
                        <div style={{ color: "#202124", fontSize: "14px", fontWeight: 400, marginBottom: "8px" }}>
                          {dep.time} · {leg.departure_airport.name} ({leg.departure_airport.id})
                        </div>
                        <div style={{ color: "#5f6368", fontSize: "13px", marginBottom: "12px" }}>
                          Travel time: {formatDuration(leg.duration)}
                          {leg.overnight && <span style={{ color: "#d93025", marginLeft: "6px", fontWeight: 500 }}>⚠ Overnight</span>}
                        </div>
                        <div style={{ color: "#202124", fontSize: "14px", fontWeight: 400, marginBottom: "8px" }}>
                          {arr.time}{legDayOffset} · {leg.arrival_airport.name} ({leg.arrival_airport.id})
                        </div>
                        <div style={{ color: "#5f6368", fontSize: "13px" }}>
                          {leg.airline} · {leg.travel_class || "Economy"} · {leg.airplane}
                          {leg.flight_number ? ` · ${leg.flight_number}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", color: "#5f6368", fontSize: "13px" }}>
                        {legroomExt && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
                              <rect x="2" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                              <line x1="4" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.2"/>
                              <line x1="4" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                            <span>{legroomExt}</span>
                          </div>
                        )}
                        {powerExt && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
                              <rect x="6" y="2" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                              <line x1="8" y1="8" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2"/>
                              <line x1="5" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                            <span>{powerExt}</span>
                          </div>
                        )}
                        {entertainmentExt && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
                              <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                              <path d="M6 4 L6 12 L12 8 Z" fill="currentColor"/>
                            </svg>
                            <span>{entertainmentExt}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {layover && (
                      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 240px", gap: "24px", paddingTop: "16px", paddingBottom: "16px", position: "relative" }}>
                        <div />
                        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ position: "absolute", top: 0, left: 0, right: 0, borderTop: "1px solid #e8eaed" }} />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderBottom: "1px solid #e8eaed" }} />
                          <div style={{ color: "#202124", fontSize: "13px", textAlign: "center", width: "100%", padding: "8px 0", position: "relative", zIndex: 1 }}>
                            {formatDuration(layover.duration)} layover · {layover.name} ({layover.id})
                            {layover.overnight && (
                              <span style={{ color: "#d93025", marginLeft: "6px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                ⚠ Overnight layover
                              </span>
                            )}
                          </div>
                        </div>
                        <div />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={itineraryRef} className="space-y-3 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-60px)] w-full max-w-full print:overflow-visible print:max-h-none print:h-auto">
      {/* Trip Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4 relative">
        <button 
            onClick={() => handlePrint()}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors print:hidden"
            title="Download / Print Itinerary"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
        </button>
        <div className="space-y-2">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-orange-200 shadow-sm">
              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className="font-semibold text-xs text-gray-700">{itinerary.dates}</span>
            </div>
            
            {itinerary.departure_city && (
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <span className="text-base font-bold text-gray-900">{itinerary.departure_city}</span>
                </div>
                
                <div className="flex-1 flex items-center">
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600"></div>
                  <div className="mx-1.5 animate-pulse">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                    </svg>
                  </div>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-600 to-orange-400"></div>
                </div>
                
                <div className="flex items-center gap-1.5 group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <span className="text-base font-bold text-gray-900">{itinerary.destination}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold border border-orange-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                {itinerary.trip_type}
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {itinerary.budget}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map and Destination Overview Section - Side by Side */}
      {itinerary.location?.place_results && (
        <div className="grid grid-cols-1 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] lg:grid-cols-[minmax(0,1.86fr)_minmax(0,1fr)] gap-2 min-w-0 max-w-full">
          {/* Destination Overview Section - Left */}
          <div className="bg-white  p-4 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              <h2 className="text-xl font-bold text-gray-900 break-words">Destination Overview</h2>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-gray-800 break-words">{itinerary.location.place_results.title}</h3>
              
              {itinerary.location.place_results.description?.snippet && (
                <p className="text-gray-700 leading-relaxed break-words">{itinerary.location.place_results.description.snippet}</p>
              )}
              
              {itinerary.location.place_results.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-lg">📍</span>
                  <span className="text-sm font-medium">{itinerary.location.place_results.address}</span>
                </div>
              )}
              
              {itinerary.location.place_results.images && itinerary.location.place_results.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {itinerary.location.place_results.images
                    .filter((img) => img.thumbnail && !img.thumbnail.includes("serpapi.com"))
                    .slice(0, 2)
                    .map((img, idx) => {
                      const thumbnailUrl = img.thumbnail || ""
                      return (
                        <div key={`${img.title}-${idx}`} className="relative">
                          <img
                            src={thumbnailUrl}
                            alt={img.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )
                    })}
                </div>
              )}
              
              {itinerary.location.place_results.weather && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-lg">🌤️</span>
                  <span className="text-sm">
                    {itinerary.location.place_results.weather.conditions} - {itinerary.location.place_results.weather.celsius} / {itinerary.location.place_results.weather.fahrenheit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Map Section */}
          {itinerary.flights?.coordinates && (() => {
            const coords = itinerary.flights?.coordinates;
            if (!coords) return null;
            
            const hasAnyCoords = coords.departure_airport || coords.departure_place || coords.arrival_airport || coords.arrival_place;
            if (!hasAnyCoords) return null;

            const airportIcon = new L.Icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });

            const placeIcon = new L.Icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });

            const allCoords: [number, number][] = [];
            if (coords.departure_place) allCoords.push([coords.departure_place.lat, coords.departure_place.lon]);
            if (coords.departure_airport) allCoords.push([coords.departure_airport.lat, coords.departure_airport.lon]);
            if (coords.arrival_place) allCoords.push([coords.arrival_place.lat, coords.arrival_place.lon]);
            if (coords.arrival_airport) allCoords.push([coords.arrival_airport.lat, coords.arrival_airport.lon]);

            let centerLat: number;
            let centerLon: number;
            if (coords.arrival_place) {
              centerLat = coords.arrival_place.lat;
              centerLon = coords.arrival_place.lon;
            } else if (coords.arrival_airport) {
              centerLat = coords.arrival_airport.lat;
              centerLon = coords.arrival_airport.lon;
            } else {
              centerLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
              centerLon = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
            }

            const zoom = 3;

            // Create paths
            let routePath: [number, number][] = [];
            if (coords.departure_airport && coords.arrival_airport) {
              routePath = [
                [coords.departure_airport.lat, coords.departure_airport.lon],
                [coords.arrival_airport.lat, coords.arrival_airport.lon]
              ];
            }

            let departureConnectionPath: [number, number][] = [];
            if (coords.departure_place && coords.departure_airport) {
              departureConnectionPath = [
                [coords.departure_place.lat, coords.departure_place.lon],
                [coords.departure_airport.lat, coords.departure_airport.lon]
              ];
            }

            let arrivalConnectionPath: [number, number][] = [];
            if (coords.arrival_airport && coords.arrival_place) {
              arrivalConnectionPath = [
                [coords.arrival_airport.lat, coords.arrival_airport.lon],
                [coords.arrival_place.lat, coords.arrival_place.lon]
              ];
            }

            return (
              <div className="bg-white p-4 min-w-0 max-w-full overflow-hidden">
                <div className={`w-full max-w-full rounded-lg overflow-hidden border border-gray-200 ${isRightPanelExpanded ? 'h-96' : 'h-86'}`}>
                  <MapContainer
                    center={[centerLat, centerLon]}
                    zoom={zoom}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <ChangeView center={[centerLat, centerLon]} zoom={zoom} />
                    <RemoveZoomControl />
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                    />
                    {coords.departure_place && (
                      <Marker position={[coords.departure_place.lat, coords.departure_place.lon]} icon={placeIcon}>
                        <Popup>Departure Place</Popup>
                      </Marker>
                    )}
                    {coords.departure_airport && (
                      <Marker position={[coords.departure_airport.lat, coords.departure_airport.lon]} icon={airportIcon}>
                        <Popup>Departure Airport</Popup>
                      </Marker>
                    )}
                    {coords.arrival_airport && (
                      <Marker position={[coords.arrival_airport.lat, coords.arrival_airport.lon]} icon={airportIcon}>
                        <Popup>Arrival Airport</Popup>
                      </Marker>
                    )}
                    {coords.arrival_place && (
                      <Marker position={[coords.arrival_place.lat, coords.arrival_place.lon]} icon={placeIcon}>
                        <Popup>Arrival Place</Popup>
                      </Marker>
                    )}
                    {/* Polylines */}
                    {departureConnectionPath.length > 0 && (
                      <Polyline
                        positions={departureConnectionPath}
                        pathOptions={{ color: "#34a853", weight: 2, opacity: 0.6, dashArray: "10, 5" }}
                      />
                    )}
                    {routePath.length > 0 && (
                      <Polyline
                        positions={routePath}
                        pathOptions={{ color: "#1a73e8", weight: 3, opacity: 0.7 }}
                      />
                    )}
                    {arrivalConnectionPath.length > 0 && (
                      <Polyline
                        positions={arrivalConnectionPath}
                        pathOptions={{ color: "#34a853", weight: 2, opacity: 0.6, dashArray: "10, 5" }}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Hotels and Flights Section */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* Hotels Section */}
        {itinerary.hotels && itinerary.hotels.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4" style={{ flex: "0 0 40%", minWidth: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
              <h2 className="text-xl font-semibold text-gray-800">🏨 Recommended Hotels</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {itinerary.hotels.map((hotel, hotelIndex) => (
                <div 
                  key={hotelIndex}
                  className="bg-gradient-to-br from-white via-orange-50/30 to-white rounded-lg p-3 border border-gray-200/60 hover:border-orange-300 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-800 flex-1 pr-2 leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors">
                      {hotel.name}
                    </h3>
                    {hotel.hotel_class && (
                      <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50 flex-shrink-0">
                        {Array.from({ length: hotel.hotel_class }).map((_, i) => (
                          <span key={i} className="text-amber-500 text-[10px] leading-none">★</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-2.5">
                    <p className="text-[9px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Price per night</p>
                    <p className="text-base font-bold text-emerald-600">{hotel.price_per_night}</p>
                  </div>
                  {hotel.link && (
                    <a
                      href={hotel.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-2.5 py-1.5 rounded-md hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium text-[10px] w-full justify-center shadow-sm hover:shadow-md"
                    >
                      Book Now
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flights Section */}
        {itinerary.flights && (() => {
          const flights = itinerary.flights;
          const allFlights = 
            (flights.best_flights && flights.best_flights.length > 0)
              ? flights.best_flights
              : (flights.other_flights && flights.other_flights.length > 0)
              ? flights.other_flights
              : [];

          if (allFlights.length === 0) return null;

          const flightsToDisplay = showAllFlights ? allFlights : allFlights.slice(0, 2);
          const hasMoreFlights = allFlights.length > 2;

          return (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4" style={{ flex: "0 0 60%", minWidth: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                  <h2 className="text-xl font-semibold text-gray-800">Available Flights</h2>
                </div>
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                {flightsToDisplay.map((option, idx) => renderBestFlightRow(option, idx))}
              </div>
              {hasMoreFlights && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                  <button
                    onClick={() => setShowAllFlights(!showAllFlights)}
                    className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-orange-600 font-medium text-sm hover:bg-orange-50 hover:border-orange-400 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {showAllFlights ? "Show less" : `Show more (${allFlights.length - 2} more)`}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Days */}
      {itinerary.days && Array.isArray(itinerary.days) && itinerary.days.map((day, dayIndex) => {
        const dayTitle = day.day ? day.day.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() : ''
        
        let descriptionToRender = day.description || ''
        let firstPart = ''
        
        if (descriptionToRender) {
          const lines = descriptionToRender.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
              firstPart = trimmed.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
              const firstLineIndex = descriptionToRender.indexOf(trimmed)
              if (firstLineIndex >= 0) {
                descriptionToRender = descriptionToRender.substring(firstLineIndex + trimmed.length).trim()
                if (descriptionToRender.startsWith('\n\n')) {
                  descriptionToRender = descriptionToRender.substring(2).trim()
                }
              }
              break
            }
          }
        }
        
        const fullTitle = firstPart ? `${dayTitle} ${firstPart}` : dayTitle
        
        return (
          <div key={dayIndex} className="bg-white rounded-2xl shadow-sm p-4">
            {fullTitle && (
              <div className="mb-3">
                <h2 className="text-xl font-bold text-blue-600 mb-2 pb-2 border-b-2 border-blue-100">
                  {fullTitle}
                </h2>
              </div>
            )}
            
            {descriptionToRender && (
              <div className="prose max-w-none">
                {renderItineraryMarkdown(descriptionToRender)}
              </div>
            )}

            {/* Extra Activities List */}
            {extraActivities[dayIndex] && extraActivities[dayIndex].length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <span className="text-amber-500">★</span> My Added Activities
                    </h4>
                    <ul className="space-y-2">
                        {extraActivities[dayIndex].map((activity, idx) => (
                            <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-amber-200 bg-amber-50/50 py-1 pr-2 rounded-r">
                                {activity}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Add Activity Section - Show for all days except the last one */}
            {dayIndex !== (itinerary.days?.length || 0) - 1 && (
                <div className="mt-4 flex flex-col gap-2">
                    {!showActivityInput[dayIndex] ? (
                        <button 
                            onClick={() => setShowActivityInput(prev => ({ ...prev, [dayIndex]: true }))}
                            className="self-start text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            Add Activity
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={newActivityInput[dayIndex] || ''}
                                onChange={(e) => setNewActivityInput(prev => ({ ...prev, [dayIndex]: e.target.value }))}
                                placeholder="Add a new activity..."
                                className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleAddActivity(dayIndex)}
                            />
                            <button 
                                onClick={() => handleAddActivity(dayIndex)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                            >
                                Save
                            </button>
                            <button 
                                onClick={() => setShowActivityInput(prev => ({ ...prev, [dayIndex]: false }))}
                                className="text-gray-500 hover:text-gray-700 p-1.5"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ItineraryView

