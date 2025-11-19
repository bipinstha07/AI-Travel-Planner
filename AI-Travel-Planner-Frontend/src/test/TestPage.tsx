import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface FlightSearchPayload {
  departure_id: string;
  arrival_id: string;
  outbound_date: string;
  return_date: string;
  currency: string;
  hl: string;
}

interface FlightLeg {
  airline: string;
  flight_number: string;
  departure: string;
  arrival: string;
  duration_min: number;
  airplane: string;
  travel_class: string;
  legroom?: string;
  airline_logo?: string;
}

interface FlightOption {
  rank: number;
  route: string;
  type: string;
  price: string;
  total_duration_min: number;
  layovers?: string[];
  legs: FlightLeg[];
  airline_logo?: string;
}

interface Coordinates {
  departure_place?: {
    lat: number;
    lon: number;
  };
  departure_airport?: {
    lat: number;
    lon: number;
  };
  arrival_place?: {
    lat: number;
    lon: number;
  };
  arrival_airport?: {
    lat: number;
    lon: number;
  };
}

interface FlightApiResponse {
  // previous summary shape
  route?: string;
  flights_found?: number;
  flights?: FlightOption[];
  summary?: {
    route: string;
    flights_found: number;
    flights: FlightOption[];
  };
  // new detailed shape
  price_insights?: {
    lowest_price: number;
    price_level: string;
    typical_price_range: [number, number];
  };
  best_flights?: BestFlightOption[];
  other_flights?: BestFlightOption[];
  search_metadata?: {
    google_flights_url?: string;
  };
  coordinates?: Coordinates;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

interface AirportRef {
  name: string;
  id: string;
  time: string; // "YYYY-MM-DD HH:MM"
}

interface CarbonEmissions {
  this_flight: number;
  typical_for_this_route: number;
  difference_percent: number;
}

interface BestFlightLeg {
  departure_airport: AirportRef;
  arrival_airport: AirportRef;
  duration: number; // minutes
  airplane: string;
  airline: string;
  airline_logo?: string;
  travel_class?: string;
  flight_number?: string;
  legroom?: string;
  extensions?: string[];
  overnight?: boolean;
  often_delayed_by_over_30_min?: boolean;
  ticket_also_sold_by?: string[];
}

interface LayoverInfo {
  duration: number; // minutes
  name: string;
  id: string;
  overnight?: boolean;
}

interface BestFlightOption {
  flights: BestFlightLeg[];
  layovers?: LayoverInfo[];
  total_duration: number; // minutes
  carbon_emissions?: CarbonEmissions;
  price?: number;
  type?: string;
  airline_logo?: string;
  departure_token?: string;
}

const formatDateTime = (dt: string) => {
  // expects "YYYY-MM-DD HH:MM"
  try {
    const [date, time] = dt.split(" ");
    const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
    const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
    const jsDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    const timeStr = jsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const weekday = jsDate.toLocaleDateString([], { weekday: "short" });
    const monthDay = jsDate.toLocaleDateString([], { month: "short", day: "numeric" });
    return { time: timeStr, dateLabel: `${weekday}, ${monthDay}` };
  } catch {
    return { time: dt.split(" ")[1] || dt, dateLabel: dt.split(" ")[0] || "" };
  }
};

const parseDateFromRef = (ref: AirportRef): Date | null => {
  try {
    const [date, time] = ref.time.split(" ");
    const [y, m, d] = date.split("-").map(Number);
    const [hh = 0, mm = 0] = (time || "").split(":").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh, mm);
  } catch {
    return null;
  }
};

const getDayOffsetSuffix = (start: AirportRef, end: AirportRef) => {
  const startDate = parseDateFromRef(start);
  const endDate = parseDateFromRef(end);
  if (!startDate || !endDate) return "";
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays > 0 ? `+${diffDays}` : "";
};

// Component to update map view when coordinates change
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function MapView() {
  const [flightForm, setFlightForm] = useState<FlightSearchPayload>({
    departure_id: "KTM",
    arrival_id: "PEK",
    outbound_date: "2025-11-12",
    return_date: "2025-11-18",
    currency: "USD",
    hl: "en",
  });
  const [flightResponse, setFlightResponse] = useState<FlightApiResponse | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [expandedBest, setExpandedBest] = useState<Record<number, boolean>>({});
  const [expandedSummary, setExpandedSummary] = useState<Record<number, boolean>>({});

  const flightFields: Array<{
    label: string;
    field: keyof FlightSearchPayload;
    type: "text" | "date";
    placeholder?: string;
  }> = [
    { label: "Departure Airport", field: "departure_id", type: "text", placeholder: "e.g. KTM" },
    { label: "Arrival Airport", field: "arrival_id", type: "text", placeholder: "e.g. PEK" },
    { label: "Outbound Date", field: "outbound_date", type: "date" },
    { label: "Return Date", field: "return_date", type: "date" },
    { label: "Currency", field: "currency", type: "text", placeholder: "e.g. USD" },
    { label: "Language", field: "hl", type: "text", placeholder: "e.g. en" },
  ];

  const fetchFlightData = async (payload: FlightSearchPayload) => {
    setFlightLoading(true);
    setFlightError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/flight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch flights: ${response.statusText}`);
      }

      const responseData: FlightApiResponse = await response.json();
      setFlightResponse(responseData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error fetching flight data";
      setFlightError(errorMessage);
      console.error("Error fetching flight data:", err);
    } finally {
      setFlightLoading(false);
    }
  };

  const handleFlightSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchFlightData(flightForm);
  };

  const handleFlightChange = (field: keyof FlightSearchPayload, value: string) => {
    setFlightForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const googleFlightsUrl = flightResponse?.search_metadata?.google_flights_url;

  const getFlightUrl = (option: BestFlightOption | FlightOption) => {
    const baseUrl = googleFlightsUrl || '';
    if (!baseUrl) return null;
    
    // If it's a BestFlightOption with departure_token, replace tfu parameter to make it flight-specific
    if ('departure_token' in option && option.departure_token) {
      try {
        const url = new URL(baseUrl);
        // Replace or set the tfu parameter with the departure_token
        url.searchParams.set('tfu', option.departure_token);
        return url.toString();
      } catch (e) {
        // If URL parsing fails, try string replacement
        if (baseUrl.includes('tfu=')) {
          return baseUrl.replace(/tfu=[^&]*/, `tfu=${encodeURIComponent(option.departure_token)}`);
        } else {
          return `${baseUrl}&tfu=${encodeURIComponent(option.departure_token)}`;
        }
      }
    }
    
    // For FlightOption or if no token, return base URL
    return baseUrl;
  };

  const toggleExpandedBest = (idx: number) => {
    setExpandedBest((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleExpandedSummary = (rank: number) => {
    setExpandedSummary((prev) => ({ ...prev, [rank]: !prev[rank] }));
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

    const stopsCount =
      option.layovers?.length ?? Math.max(option.flights.length - 1, 0);
    const stopsLabel =
      stopsCount === 0 ? "Nonstop" : `${stopsCount} stop${stopsCount > 1 ? "s" : ""}`;
    const primaryLayover = option.layovers && option.layovers.length > 0 ? option.layovers[0] : null;
    const hasOvernightLayover = option.layovers?.some((layover) => layover.overnight) ?? false;

    const primaryAirline = firstLeg.airline;
    const departureDateLabel = new Date(flightForm.outbound_date).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const isExpanded = !!expandedBest[idx];
    const headerGridTemplate = "auto minmax(180px, 1.2fr) 140px 180px auto auto";

    const expandedContainerStyle = {
      maxHeight: isExpanded ? "1600px" : "0px",
      opacity: isExpanded ? 1 : 0,
      overflow: "hidden" as const,
      transition: "max-height 0.2s ease, opacity 0.2s ease",
      background: "#fff",
    };

    const expandedInnerStyle = isExpanded
      ? {
          padding: "0 24px 24px 24px",
          transform: "translateY(0)",
          opacity: 1,
          visibility: "visible" as const,
          transition:
            "transform 0.5s ease, opacity 0.3s ease 0.1s, visibility 0s linear 0s",
          pointerEvents: "auto" as const,
        }
      : {
          padding: "0 24px",
          transform: "translateY(-8px)",
          opacity: 0,
          visibility: "hidden" as const,
          transition:
            "transform 0.5s ease, opacity 0.25s ease 0.5s, visibility 0s linear 0.5s",
          pointerEvents: "none" as const,
        };

    return (
      <div
        key={idx}
        style={{
          border: "1px solid #dadce0",
          borderRadius: "8px",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Collapsed row - clickable - only show when not expanded */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: headerGridTemplate,
            alignItems: "center",
            gap: "20px",
            padding: "18px 24px",
            cursor: "pointer",
            transition: "background-color 0.15s",
            backgroundColor: expandedBest[idx] ? "#f8f9fa" : "#fff",
          }}
          onClick={() => toggleExpandedBest(idx)}
        >
          {/* Airline + timeline primary info */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {option.airline_logo && (
              <img
                src={option.airline_logo}
                alt={primaryAirline || "airline"}
                style={{ width: "42px", height: "42px", objectFit: "contain" }}
                referrerPolicy="no-referrer"
              />
            )}
            <div style={{ display: "grid", gap: "4px" }}>
              <div
                style={{
                  color: "#202124",
                  fontSize: "16px",
                  fontWeight: 500,
                }}
              >
                {isExpanded ? `Departure · ${departureDateLabel}` : timeLabel}
              </div>
              {primaryAirline && (
                <div
                  style={{
                    color: "#5f6368",
                    fontSize: "13px",
                  }}
                >
                  {primaryAirline}
                </div>
              )}
            </div>
          </div>
          {/* Duration */}
          <div style={{ display: "grid", gap: "4px", textAlign: "center", justifySelf: "center" }}>
            <div style={{ color: "#202124", fontSize: "15px", fontWeight: 500 }}>{formatDuration(option.total_duration)}</div>
            <div style={{ color: "#5f6368", fontSize: "12px" }}>{routeLabel}</div>
          </div>
          {/* Stops */}
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ color: hasOvernightLayover ? "#d93025" : "#202124", fontSize: "15px", fontWeight: 500 }}>
              {stopsLabel}
              {hasOvernightLayover && <span style={{ marginLeft: "4px" }}>⚠</span>}
            </div>
            {stopsCount > 0 && primaryLayover && (
              <div style={{ color: "#5f6368", fontSize: "12px" }}>
                {formatDuration(primaryLayover.duration)} · {primaryLayover.name}
              </div>
            )}
          </div>
          {/* Price */}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#188038", fontSize: "16px", fontWeight: 500 }}>
              {option.price != null ? `$${option.price}` : "Price unavailable"}
            </div>
            <div style={{ color: "#5f6368", fontSize: "12px" }}>round trip</div>
          </div>
          {/* Select Flight Button */}
          {getFlightUrl(option) && (
            <div style={{ display: "flex", alignItems: "center", justifySelf: "end" }}>
              <a
                href={getFlightUrl(option) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "1px solid #1a73e8",
                  background: "#fff",
                  color: "#1a73e8",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "13px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
              >
                Select flight
              </a>
            </div>
          )}
          {/* Chevron */}
          <div
            style={{
              transform: expandedBest[idx] ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: "#5f6368",
              fontSize: "16px",
              lineHeight: 1,
              cursor: "pointer",
              justifySelf: "end",
            }}
          >
            ▼
          </div>
        </div>

        {/* Expanded details */}
        <div style={expandedContainerStyle} aria-hidden={!expandedBest[idx]}>
          <div style={expandedInnerStyle}>
            <div style={{ position: "relative" }}>
              {option.flights.map((leg, legIdx) => {
                const dep = formatDateTime(leg.departure_airport.time);
                const arr = formatDateTime(leg.arrival_airport.time);
                const legDayOffset = getDayOffsetSuffix(
                  leg.departure_airport,
                  leg.arrival_airport
                );

                // Parse amenities from extensions
                const legroomExt = leg.extensions?.find(
                  (e) => e.includes("legroom") || e.includes("Legroom")
                );
                const powerExt = leg.extensions?.find(
                  (e) => e.includes("power") || e.includes("USB") || e.includes("outlet")
                );
                const entertainmentExt = leg.extensions?.find(
                  (e) => e.includes("video") || e.includes("entertainment") || e.includes("media")
                );
                const layover = option.layovers?.[legIdx] || null;

                return (
                  <div key={legIdx}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "40px 1fr 240px",
                        gap: "24px",
                        padding: "20px 0",
                        position: "relative",
                      }}
                    >
                      {/* Timeline column */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          position: "relative",
                          minHeight: "120px",
                        }}
                      >
                        {/* Departure circle */}
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            border: "2px solid #1a73e8",
                            background: "#fff",
                            zIndex: 2,
                            position: "relative",
                            flexShrink: 0,
                          }}
                        />
                        {/* Connecting line to arrival */}
                        <div
                          style={{
                            flexGrow: 1,
                            minHeight: "80px",
                            borderLeft: "2px dotted #dadce0",
                            width: "0px",
                            margin: "4px 0",
                          }}
                        />
                        {/* Arrival circle */}
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            border: "2px solid #1a73e8",
                            background: "#fff",
                            zIndex: 2,
                            position: "relative",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                      {/* Flight details column */}
                      <div>
                        <div style={{ color: "#202124", fontSize: "14px", fontWeight: 400, marginBottom: "8px" }}>
                          {dep.time} · {leg.departure_airport.name} ({leg.departure_airport.id})
                        </div>
                        <div
                          style={{ color: "#5f6368", fontSize: "13px", marginBottom: "12px" }}
                        >
                          Travel time: {formatDuration(leg.duration)}
                          {leg.overnight && (
                            <span
                              style={{
                                color: "#d93025",
                                marginLeft: "6px",
                                fontWeight: 500,
                              }}
                            >
                              ⚠ Overnight
                            </span>
                          )}
                        </div>
                        <div style={{ color: "#202124", fontSize: "14px", fontWeight: 400, marginBottom: "8px" }}>
                          {arr.time}
                          {legDayOffset} · {leg.arrival_airport.name} ({leg.arrival_airport.id})
                        </div>
                        <div style={{ color: "#5f6368", fontSize: "13px" }}>
                          {leg.airline} · {leg.travel_class || "Economy"} · {leg.airplane}
                          {leg.flight_number ? ` · ${leg.flight_number}` : ""}
                        </div>
                      </div>
                      {/* Amenities column */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          color: "#5f6368",
                          fontSize: "13px",
                        }}
                      >
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
                    {/* Layover */}
                    {layover && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "40px 1fr 240px",
                          gap: "24px",
                          paddingTop: "16px",
                          paddingBottom: "16px",
                          position: "relative",
                        }}
                      >
                        <div />
                        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {/* Top horizontal line - aligns with flight details column */}
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              borderTop: "1px solid #e8eaed",
                            }}
                          />
                          {/* Bottom horizontal line - aligns with flight details column */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              borderBottom: "1px solid #e8eaed",
                            }}
                          />
                          <div style={{ color: "#202124", fontSize: "13px", textAlign: "center", width: "100%", padding: "8px 0", position: "relative", zIndex: 1 }}>
                            {formatDuration(layover.duration)} layover · {layover.name} ({layover.id})
                            {layover.overnight && (
                              <span
                                style={{
                                  color: "#d93025",
                                  marginLeft: "6px",
                                  fontWeight: 500,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
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

  const renderSummaryFlightRow = (flight: FlightOption) => {
    if (!flight.legs.length) return null;
    const firstLeg = flight.legs[0];
    const lastLeg = flight.legs[flight.legs.length - 1];
    const stopsCount = Math.max(flight.legs.length - 1, 0);
    const stopsLabel =
      stopsCount === 0 ? "Nonstop" : `${stopsCount} stop${stopsCount > 1 ? "s" : ""}`;

    const routeLabel = `${firstLeg.departure.split(" ")[0]}-${lastLeg.arrival.split(" ")[0]}`;
    const layoverSummary = flight.layovers && flight.layovers.length > 0 
      ? flight.layovers.map(l => {
          const match = l.match(/(\d+)\s*(min|hr)/);
          return match ? l : null;
        }).filter(Boolean).join(", ")
      : null;

    const isExpanded = !!expandedSummary[flight.rank];
    const headerGridTemplate = "auto 1fr auto auto auto auto";

    const expandedContainerStyle = {
      maxHeight: isExpanded ? "1200px" : "0px",
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
          transition:
            "transform 0.5s ease, opacity 0.3s ease 0.1s, visibility 0s linear 0s",
          pointerEvents: "auto" as const,
        }
      : {
          padding: "0 16px",
          transform: "translateY(-8px)",
          opacity: 0,
          visibility: "hidden" as const,
          transition:
            "transform 0.5s ease, opacity 0.25s ease 0.5s, visibility 0s linear 0.5s",
          pointerEvents: "none" as const,
        };

    return (
      <div
        key={flight.rank}
        style={{
          border: "1px solid #dadce0",
          borderRadius: "8px",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Collapsed row - clickable - only show when not expanded */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: headerGridTemplate,
            alignItems: "center",
            gap: "16px",
            padding: "12px 16px",
            cursor: "pointer",
            transition: "background-color 0.15s",
            backgroundColor: expandedSummary[flight.rank] ? "#f8f9fa" : "#fff",
          }}
          onClick={() => toggleExpandedSummary(flight.rank)}
        >
          {/* Airline logo */}
          {flight.airline_logo && (
            <img
              src={flight.airline_logo}
              alt="airline"
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
              referrerPolicy="no-referrer"
            />
          )}
          {/* Route */}
          <div style={{ display: "grid", gap: "4px" }}>
            <div
              style={{
                color: "#202124",
                fontSize: "14px",
                fontWeight: 400,
              }}
            >
              {flight.route}
            </div>
            <div style={{ color: "#5f6368", fontSize: "13px" }}>{routeLabel}</div>
          </div>
          {/* Duration */}
          <div style={{ display: "grid", gap: "4px", textAlign: "center", justifySelf: "center" }}>
            <div style={{ color: "#5f6368", fontSize: "14px" }}>
              {formatDuration(flight.total_duration_min)}
            </div>
          </div>
          {/* Stops */}
          <div style={{ color: "#5f6368", fontSize: "14px" }}>
            {stopsLabel}
            {layoverSummary && `, ${layoverSummary}`}
          </div>
          {/* Price */}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#202124", fontSize: "14px", fontWeight: 500 }}>
              {flight.price}
            </div>
            <div style={{ color: "#5f6368", fontSize: "12px" }}>{flight.type}</div>
          </div>
          {/* Select Flight Button */}
          {getFlightUrl(flight) && (
            <div style={{ display: "flex", alignItems: "center", justifySelf: "end" }}>
              <a
                href={getFlightUrl(flight) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "1px solid #1a73e8",
                  background: "#fff",
                  color: "#1a73e8",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "13px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
              >
                Select flight
              </a>
            </div>
          )}
          {/* Chevron */}
          <div
            style={{
              transform: expandedSummary[flight.rank] ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: "#5f6368",
              fontSize: "20px",
              lineHeight: 1,
              cursor: "pointer",
              justifySelf: "end",
            }}
          >
            ▼
          </div>
        </div>

        <div style={expandedContainerStyle} aria-hidden={!expandedSummary[flight.rank]}>
          <div style={expandedInnerStyle}>
            {/* Flight legs */}
            {flight.legs.map((leg, legIdx) => (
              <div key={legIdx} style={{ marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  <div>
                    <div style={{ color: "#202124", fontSize: "14px", fontWeight: 400, marginBottom: "8px" }}>
                      {leg.departure}
                    </div>
                    <div style={{ color: "#5f6368", fontSize: "13px", marginBottom: "12px" }}>
                      Travel time: {formatDuration(leg.duration_min)}
                    </div>
                    <div style={{ color: "#202124", fontSize: "14px", fontWeight: 400, marginBottom: "8px" }}>
                      {leg.arrival}
                    </div>
                    <div style={{ color: "#5f6368", fontSize: "13px" }}>
                      {leg.airline} · {leg.travel_class} · {leg.airplane}
                      {leg.flight_number ? ` · ${leg.flight_number}` : ""}
                      {leg.legroom ? ` · Legroom ${leg.legroom}` : ""}
                    </div>
                  </div>
                </div>
                {flight.layovers && flight.layovers[legIdx] && (
                  <div
                    style={{
                      borderTop: "1px solid #e8eaed",
                      paddingTop: "12px",
                      marginTop: "12px",
                      color: "#202124",
                      fontSize: "13px",
                    }}
                  >
                    {flight.layovers[legIdx]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          marginBottom: "40px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <h2 style={{ margin: "0 0 16px 0", fontSize: "24px", color: "#333" }}>Flight Search</h2>
        <form onSubmit={handleFlightSubmit} style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {flightFields.map(({ label, field, type, placeholder }) => (
              <label
                key={field}
                style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#555" }}
              >
                {label}
          <input
                  type={type}
                  value={flightForm[field]}
                  onChange={(e) => handleFlightChange(field, e.target.value)}
                  required
                  placeholder={placeholder}
            style={{
              padding: "12px 16px",
              fontSize: "16px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              outline: "none",
            }}
          />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={flightLoading}
            style={{
              justifySelf: "flex-start",
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: flightLoading ? "#cccccc" : "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: flightLoading ? "not-allowed" : "pointer",
              fontWeight: 600,
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => {
              if (!flightLoading) e.currentTarget.style.backgroundColor = "#1565c0";
            }}
            onMouseLeave={(e) => {
              if (!flightLoading) e.currentTarget.style.backgroundColor = "#1976d2";
            }}
          >
            {flightLoading ? "Searching..." : "Find Flights"}
          </button>
        </form>
        {flightError && (
          <p style={{ color: "#f44336", marginTop: "10px", fontSize: "14px" }}>{flightError}</p>
        )}
        {flightResponse && (
          <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    color: "#202124",
                    fontWeight: 500,
                  }}
                >
                  Departing flights
                </h3>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#5f6368",
                    maxWidth: "560px",
                    lineHeight: 1.6,
                  }}
                >
                  Prices include required taxes + fees for 1 adult. Optional charges and bag fees may apply.
                  <a
                    href="https://support.google.com/travel/answer/9771784"
                          target="_blank"
                          rel="noopener noreferrer"
                    style={{ color: "#1a73e8", textDecoration: "none", marginLeft: "4px" }}
                        >
                    Passenger assistance info.
                        </a>
                </div>
                {flightResponse.price_insights?.lowest_price != null && (
                  <div style={{ fontSize: "12px", color: "#5f6368" }}>
                    Lowest price: {flightResponse.price_insights.lowest_price} {flightForm.currency}
                  </div>
                )}
              </div>
              <div
                            style={{ 
                              display: "flex",
                              alignItems: "center",
                  gap: "6px",
                  color: "#1a73e8",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span>Sorted by top flights</span>
                <span style={{ fontSize: "18px", lineHeight: 1 }}>↕</span>
                  </div>
                </div>

            {(() => {
              // Prioritize best_flights, fallback to other_flights, then summary
              const flightsToDisplay = 
                (flightResponse.best_flights && flightResponse.best_flights.length > 0)
                  ? flightResponse.best_flights.slice(0, 6)
                  : (flightResponse.other_flights && flightResponse.other_flights.length > 0)
                  ? flightResponse.other_flights.slice(0, 6)
                  : [];

              if (flightsToDisplay.length > 0) {
                return flightsToDisplay.map((option, idx) => renderBestFlightRow(option, idx));
              } else {
                return (flightResponse.summary?.flights || flightResponse.flights || []).slice(0, 6).map(
                  renderSummaryFlightRow
                );
              }
            })()}
          </div>
        )}
        </div>

        {/* Map Section */}
        {flightResponse?.coordinates && (
          <div
            style={{
              marginTop: "40px",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e0e0e0",
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "24px", color: "#333" }}>Route Map</h2>
            {(() => {
              const coords = flightResponse.coordinates;
              
              // Check if we have at least departure and arrival airports for the route
              const hasRoute = coords.departure_airport && coords.arrival_airport;
              const hasAnyCoords = coords.departure_airport || coords.departure_place || coords.arrival_airport || coords.arrival_place;

              if (!hasAnyCoords) {
                return (
                  <div style={{ padding: "20px", textAlign: "center", color: "#5f6368" }}>
                    Coordinates not available for this route
                  </div>
                );
              }

              // Create custom icons for airports and places
              // Blue icon for airports
              const airportIcon = new L.Icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              });

              // Green icon for places
              const placeIcon = new L.Icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              });

              // Collect all coordinates for bounds calculation
              const allCoords: [number, number][] = [];
              if (coords.departure_place) allCoords.push([coords.departure_place.lat, coords.departure_place.lon]);
              if (coords.departure_airport) allCoords.push([coords.departure_airport.lat, coords.departure_airport.lon]);
              if (coords.arrival_place) allCoords.push([coords.arrival_place.lat, coords.arrival_place.lon]);
              if (coords.arrival_airport) allCoords.push([coords.arrival_airport.lat, coords.arrival_airport.lon]);

              // Use airports for route calculation (actual flight path)
              const depAirport = coords.departure_airport;
              const arrAirport = coords.arrival_airport;
              
              // For center calculation, use airports if available, otherwise use places
              const departure = depAirport || coords.departure_place;
              const arrival = arrAirport || coords.arrival_place;

              if (!departure || !arrival) {
                // Prioritize arrival place for initial focus, then arrival airport, then average
                let centerLat: number;
                let centerLon: number;
                if (coords.arrival_place) {
                  centerLat = coords.arrival_place.lat;
                  centerLon = coords.arrival_place.lon;
                } else if (coords.arrival_airport) {
                  centerLat = coords.arrival_airport.lat;
                  centerLon = coords.arrival_airport.lon;
                } else {
                  const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
                  const avgLon = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
                  centerLat = avgLat;
                  centerLon = avgLon;
                }
                // When focusing on arrival location, use higher zoom for closer view
                const zoom = 25;
                // Set minZoom to prevent zooming out beyond regional view (no full world map)
                const minZoom = 3;

                return (
                  <div style={{ height: "500px", width: "100%", borderRadius: "8px", overflow: "hidden" }}>
                    <MapContainer
                      center={[centerLat, centerLon]}
                      zoom={zoom}
                      minZoom={minZoom}
                      scrollWheelZoom={true}
                      worldCopyJump={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <ChangeView center={[centerLat, centerLon]} zoom={zoom} />
                      <TileLayer
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                        maxZoom={20}
                        noWrap={true}
                      />
                      {coords.departure_place && (
                        <Marker position={[coords.departure_place.lat, coords.departure_place.lon]} icon={placeIcon}>
                          <Popup>
                            <div style={{ textAlign: "center" }}>
                              <strong>Departure Place</strong>
                              <br />
                              {coords.departure_place.lat.toFixed(4)}, {coords.departure_place.lon.toFixed(4)}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.departure_airport && (
                        <Marker position={[coords.departure_airport.lat, coords.departure_airport.lon]} icon={airportIcon}>
                          <Popup>
                            <div style={{ textAlign: "center" }}>
                              <strong>Departure Airport</strong>
                              <br />
                              {coords.departure_airport.lat.toFixed(4)}, {coords.departure_airport.lon.toFixed(4)}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.arrival_place && (
                        <Marker position={[coords.arrival_place.lat, coords.arrival_place.lon]} icon={placeIcon}>
                          <Popup>
                            <div style={{ textAlign: "center" }}>
                              <strong>Arrival Place</strong>
                              <br />
                              {coords.arrival_place.lat.toFixed(4)}, {coords.arrival_place.lon.toFixed(4)}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.arrival_airport && (
                        <Marker position={[coords.arrival_airport.lat, coords.arrival_airport.lon]} icon={airportIcon}>
                          <Popup>
                            <div style={{ textAlign: "center" }}>
                              <strong>Arrival Airport</strong>
                              <br />
                              {coords.arrival_airport.lat.toFixed(4)}, {coords.arrival_airport.lon.toFixed(4)}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {/* Departure Connection: Place to Airport */}
                      {coords.departure_place && coords.departure_airport && (
                        <Polyline
                          positions={[
                            [coords.departure_place.lat, coords.departure_place.lon],
                            [coords.departure_airport.lat, coords.departure_airport.lon]
                          ]}
                          pathOptions={{
                            color: "#34a853",
                            weight: 2,
                            opacity: 0.6,
                            dashArray: "10, 5",
                          }}
                        />
                      )}
                      {/* Arrival Connection: Airport to Place */}
                      {coords.arrival_airport && coords.arrival_place && (
                        <Polyline
                          positions={[
                            [coords.arrival_airport.lat, coords.arrival_airport.lon],
                            [coords.arrival_place.lat, coords.arrival_place.lon]
                          ]}
                          pathOptions={{
                            color: "#34a853",
                            weight: 2,
                            opacity: 0.6,
                            dashArray: "10, 5",
                          }}
                        />
                      )}
                    </MapContainer>
                  </div>
                );
              }

              const depLat = departure.lat;
              const depLon = departure.lon;
              const arrLat = arrival.lat;
              const arrLon = arrival.lon;
              
              // For route, use airports (actual flight path)
              const routeStart = depAirport ? [depAirport.lat, depAirport.lon] : [depLat, depLon];
              const routeEnd = arrAirport ? [arrAirport.lat, arrAirport.lon] : [arrLat, arrLon];

              // Helper function for coordinate calculations
              const toRad = (deg: number) => (deg * Math.PI) / 180;

              // Calculate center point for the map - prioritize arrival place for initial focus
              let centerLat: number;
              let centerLon: number;
              if (coords.arrival_place) {
                centerLat = coords.arrival_place.lat;
                centerLon = coords.arrival_place.lon;
              } else if (coords.arrival_airport) {
                centerLat = coords.arrival_airport.lat;
                centerLon = coords.arrival_airport.lon;
              } else {
                // Fallback to average of all points
                centerLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
                centerLon = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
              }

              // Create a simple straight line route (just start and end points)
              let routePath: [number, number][] = [];
              // Only draw route if we have both airports (actual flight path)
              if (hasRoute && depAirport && arrAirport) {
                routePath = [
                  routeStart as [number, number],
                  routeEnd as [number, number]
                ];
              }

              // Create line from departure place to departure airport
              let departureConnectionPath: [number, number][] = [];
              if (coords.departure_place && coords.departure_airport) {
                departureConnectionPath = [
                  [coords.departure_place.lat, coords.departure_place.lon],
                  [coords.departure_airport.lat, coords.departure_airport.lon]
                ];
              }

              // Create line from arrival airport to arrival place
              let arrivalConnectionPath: [number, number][] = [];
              if (coords.arrival_airport && coords.arrival_place) {
                arrivalConnectionPath = [
                  [coords.arrival_airport.lat, coords.arrival_airport.lon],
                  [coords.arrival_place.lat, coords.arrival_place.lon]
                ];
              }

              // Calculate zoom level based on bounds of all markers
              const minLat = Math.min(...allCoords.map(c => c[0]));
              const maxLat = Math.max(...allCoords.map(c => c[0]));
              const minLon = Math.min(...allCoords.map(c => c[1]));
              const maxLon = Math.max(...allCoords.map(c => c[1]));
              
              // Calculate distance for zoom calculation
              const R = 6371; // Earth radius in km
              const latDiff = toRad(maxLat - minLat);
              const lonDiff = toRad(maxLon - minLon);
              const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
                Math.cos(toRad(minLat)) * Math.cos(toRad(maxLat)) *
                Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceKm = R * c;

              // Adjust zoom based on distance - if focusing on arrival place, zoom in more
              let zoom = 5;
              const isFocusingOnArrival = coords.arrival_place || coords.arrival_airport;
              
              if (isFocusingOnArrival) {
                // When focusing on arrival location, use higher zoom for closer view
                if (distanceKm < 500) zoom = 25;
                else if (distanceKm < 1000) zoom = 22;
                else if (distanceKm < 3000) zoom = 18;
                else zoom = 15;
              } else {
                // When showing full route, use wider zoom
                if (distanceKm < 500) zoom = 11;
                else if (distanceKm < 1000) zoom = 9;
                else if (distanceKm < 3000) zoom = 7;
                else zoom = 5;
              }
              
              // Set minZoom to prevent zooming out to full world map (which shows duplicates)
              // Level 3 shows continental view without world map wrapping
              const minZoom = 3;

              return (
                <div style={{ height: "500px", width: "100%", borderRadius: "8px", overflow: "hidden" }}>
                  <MapContainer
                    center={[centerLat, centerLon]}
                    zoom={zoom}
                    minZoom={minZoom}
                    scrollWheelZoom={true}
                    worldCopyJump={false}
                    style={{ height: "100%", width: "100%" }}
                    key={`${allCoords.map(c => `${c[0]}-${c[1]}`).join('_')}`}
                  >
                    <ChangeView center={[centerLat, centerLon]} zoom={zoom} />
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                      maxZoom={20}
                      noWrap={true}
                    />
                    {/* Departure Place Marker */}
                    {coords.departure_place && (
                      <Marker position={[coords.departure_place.lat, coords.departure_place.lon]} icon={placeIcon}>
                        <Popup>
                          <div style={{ textAlign: "center" }}>
                            <strong>Departure Place</strong>
                            <br />
                            {coords.departure_place.lat.toFixed(4)}, {coords.departure_place.lon.toFixed(4)}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {/* Departure Airport Marker */}
                    {coords.departure_airport && (
                      <Marker position={[coords.departure_airport.lat, coords.departure_airport.lon]} icon={airportIcon}>
                        <Popup>
                          <div style={{ textAlign: "center" }}>
                            <strong>Departure Airport</strong>
                            <br />
                            {coords.departure_airport.lat.toFixed(4)}, {coords.departure_airport.lon.toFixed(4)}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {/* Arrival Place Marker */}
                    {coords.arrival_place && (
                      <Marker position={[coords.arrival_place.lat, coords.arrival_place.lon]} icon={placeIcon}>
                        <Popup>
                          <div style={{ textAlign: "center" }}>
                            <strong>Arrival Place</strong>
                            <br />
                            {coords.arrival_place.lat.toFixed(4)}, {coords.arrival_place.lon.toFixed(4)}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {/* Arrival Airport Marker */}
                    {coords.arrival_airport && (
                      <Marker position={[coords.arrival_airport.lat, coords.arrival_airport.lon]} icon={airportIcon}>
                        <Popup>
                          <div style={{ textAlign: "center" }}>
                            <strong>Arrival Airport</strong>
                            <br />
                            {coords.arrival_airport.lat.toFixed(4)}, {coords.arrival_airport.lon.toFixed(4)}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {/* Departure Connection: Place to Airport */}
                    {departureConnectionPath.length > 0 && (
                      <Polyline
                        positions={departureConnectionPath}
                        pathOptions={{
                          color: "#34a853",
                          weight: 2,
                          opacity: 0.6,
                          dashArray: "10, 5",
                        }}
                      />
                    )}
                    {/* Flight Route (only if both airports exist) */}
                    {routePath.length > 0 && (
                      <Polyline
                        positions={routePath}
                        pathOptions={{
                          color: "#1a73e8",
                          weight: 3,
                          opacity: 0.7,
                        }}
                      />
                    )}
                    {/* Arrival Connection: Airport to Place */}
                    {arrivalConnectionPath.length > 0 && (
                      <Polyline
                        positions={arrivalConnectionPath}
                        pathOptions={{
                          color: "#34a853",
                          weight: 2,
                          opacity: 0.6,
                          dashArray: "10, 5",
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
              );
            })()}
          </div>
        )}
    </div>
  );
}

