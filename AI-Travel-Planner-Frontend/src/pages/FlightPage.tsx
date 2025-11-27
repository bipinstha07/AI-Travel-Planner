import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";


// Environment variable for Python URL
const PYTHON_URL = import.meta.env.VITE_PYTHON_URL || '';
// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
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
  route?: string;
  flights_found?: number;
  flights?: FlightOption[];
  summary?: {
    route: string;
    flights_found: number;
    flights: FlightOption[];
  };
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

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function FlightPage() {
  const getFutureDate = (daysToAdd: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  };

  const [flightForm, setFlightForm] = useState<FlightSearchPayload>({
    departure_id: "",
    arrival_id: "",
    outbound_date: getFutureDate(1), // Tomorrow
    return_date: getFutureDate(15), // 14 days after tomorrow
    currency: "USD",
    hl: "en",
  });
  
  // Additional UI state to match the screenshot design
  const [tripType] = useState("Round trip");
  const [passengers] = useState(1);
  const [cabinClass] = useState("Economy");

  const [flightResponse, setFlightResponse] = useState<FlightApiResponse | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [expandedBest, setExpandedBest] = useState<Record<number, boolean>>({});
  const [expandedSummary, setExpandedSummary] = useState<Record<number, boolean>>({});

  const fetchFlightData = async (payload: FlightSearchPayload) => {
    setFlightLoading(true);
    setFlightError(null);

    try {
      const response = await fetch(`${PYTHON_URL}/api/flight`, {
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

  const handleSwapAirports = () => {
    setFlightForm(prev => ({
        ...prev,
        departure_id: prev.arrival_id,
        arrival_id: prev.departure_id
    }));
  };

  const googleFlightsUrl = flightResponse?.search_metadata?.google_flights_url;

  const getFlightUrl = (option: BestFlightOption | FlightOption) => {
    const baseUrl = googleFlightsUrl || '';
    if (!baseUrl) return null;
    
    if ('departure_token' in option && option.departure_token) {
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

    return (
      <div
        key={idx}
        className="border border-white/10 rounded-lg bg-white/2 overflow-hidden transition-colors hover:bg-white/5"
      >
        {/* Collapsed row - clickable */}
        <div
          className="grid grid-cols-[auto_minmax(180px,1.2fr)_140px_180px_auto_auto] items-center gap-6 p-5 cursor-pointer"
          onClick={() => toggleExpandedBest(idx)}
        >
          {/* Airline + timeline primary info */}
          <div className="flex items-center gap-4">
            {option.airline_logo ? (
              <img
                src={option.airline_logo}
                alt={primaryAirline || "airline"}
                className="w-8 h-8 object-contain rounded-full bg-white p-0.5"
                referrerPolicy="no-referrer"
              />
            ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[10px] text-gray-400">✈️</span>
                </div>
            )}
            <div className="grid gap-0.5">
              <div className="text-white text-base font-medium tracking-tight">
                {isExpanded ? `Departure · ${departureDateLabel}` : timeLabel}
              </div>
              {primaryAirline && (
                <div className="text-gray-400 text-xs font-light">
                  {primaryAirline}
                </div>
              )}
            </div>
          </div>
          {/* Duration */}
          <div className="grid gap-0.5 text-center justify-self-center">
            <div className="text-white text-sm font-medium">{formatDuration(option.total_duration)}</div>
            <div className="text-gray-500 text-[10px] uppercase tracking-wider">{routeLabel}</div>
          </div>
          {/* Stops */}
          <div className="grid gap-0.5">
            <div className={`text-sm font-medium ${hasOvernightLayover ? "text-red-400" : "text-white"}`}>
              {stopsLabel}
              {hasOvernightLayover && <span className="ml-1">⚠</span>}
            </div>
            {stopsCount > 0 && primaryLayover && (
              <div className="text-gray-500 text-xs">
                {formatDuration(primaryLayover.duration)} · {primaryLayover.name}
              </div>
            )}
          </div>
          {/* Price */}
          <div className="text-right">
            <div className="text-white text-base font-medium tracking-tight">
              {option.price != null ? `$${option.price}` : "N/A"}
            </div>
            <div className="text-gray-500 text-[10px]">round trip</div>
          </div>
          {/* Select Flight Button */}
          {getFlightUrl(option) && (
            <div className="flex items-center justify-self-end">
              <a
                href={getFlightUrl(option) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-1.5 rounded border border-white/20 hover:border-white/40 text-white text-xs font-medium transition-colors whitespace-nowrap"
              >
                Select
              </a>
            </div>
          )}
          {/* Chevron */}
          <div
            className={`text-gray-500 text-sm transition-transform duration-200 justify-self-end ${
                expandedBest[idx] ? "rotate-180" : "rotate-0"
            }`}
          >
            ▼
          </div>
        </div>

        {/* Expanded details */}
        <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden bg-black/20 ${
                isExpanded ? "max-h-[1600px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="p-6 pt-0">
            <div className="relative pt-6 pl-3">
              {option.flights.map((leg, legIdx) => {
                const dep = formatDateTime(leg.departure_airport.time);
                const arr = formatDateTime(leg.arrival_airport.time);
                const legDayOffset = getDayOffsetSuffix(
                  leg.departure_airport,
                  leg.arrival_airport
                );

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
                    <div className="grid grid-cols-[30px_1fr_200px] gap-6 py-4 relative">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center relative min-h-[100px]">
                        <div className="w-2 h-2 rounded-full bg-white z-10 relative shrink-0" />
                        <div className="grow w-px bg-white/20 my-1" />
                        <div className="w-2 h-2 rounded-full border border-white bg-transparent z-10 relative shrink-0" />
                      </div>
                      {/* Flight details column */}
                      <div>
                        <div className="text-white text-sm font-medium mb-1">
                          {dep.time} · {leg.departure_airport.name} ({leg.departure_airport.id})
                        </div>
                        <div className="text-gray-400 text-xs mb-3 font-light">
                          Travel time: {formatDuration(leg.duration)}
                          {leg.overnight && (
                            <span className="text-red-400 ml-1.5 font-medium">
                              ⚠ Overnight
                            </span>
                          )}
                        </div>
                        <div className="text-white text-sm font-medium mb-1">
                          {arr.time}
                          {legDayOffset} · {leg.arrival_airport.name} ({leg.arrival_airport.id})
                        </div>
                        <div className="text-gray-400 text-xs font-light mt-2">
                          {leg.airline} · {leg.travel_class || "Economy"} · {leg.airplane}
                          {leg.flight_number ? ` · ${leg.flight_number}` : ""}
                        </div>
                      </div>
                      {/* Amenities column */}
                      <div className="flex flex-col gap-2 text-gray-500 text-xs pt-1">
                        {legroomExt && (
                          <div className="flex items-center gap-2">
                             <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                             <span>{legroomExt}</span>
                          </div>
                        )}
                        {powerExt && (
                          <div className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{powerExt}</span>
                          </div>
                        )}
                        {entertainmentExt && (
                          <div className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{entertainmentExt}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Layover */}
                    {layover && (
                      <div className="py-3 pl-8 flex items-center">
                        <div className="h-px bg-white/10 flex-1 mr-4"></div>
                        <div className="text-gray-400 text-xs font-medium">
                            {formatDuration(layover.duration)} layover · {layover.name} ({layover.id})
                            {layover.overnight && (
                              <span className="text-red-400 ml-1.5">
                                ⚠ Overnight
                              </span>
                            )}
                        </div>
                        <div className="h-px bg-white/10 flex-1 ml-4"></div>
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

    return (
      <div
        key={flight.rank}
        className="border border-white/10 rounded-lg bg-white/2 overflow-hidden transition-colors hover:bg-white/5"
      >
        {/* Collapsed row - clickable */}
        <div
          className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 p-4 cursor-pointer"
          onClick={() => toggleExpandedSummary(flight.rank)}
        >
          {/* Airline logo */}
          {flight.airline_logo ? (
            <img
              src={flight.airline_logo}
              alt="airline"
              className="w-6 h-6 object-contain rounded-full bg-white p-0.5"
              referrerPolicy="no-referrer"
            />
          ) : (
             <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-[10px] text-gray-400">✈️</span>
             </div>
          )}
          {/* Route */}
          <div className="grid gap-0.5">
            <div className="text-white text-sm font-medium tracking-tight">
              {flight.route}
            </div>
            <div className="text-gray-500 text-[10px] uppercase tracking-wider">{routeLabel}</div>
          </div>
          {/* Duration */}
          <div className="grid gap-0.5 text-center justify-self-center">
            <div className="text-gray-400 text-sm">
              {formatDuration(flight.total_duration_min)}
            </div>
          </div>
          {/* Stops */}
          <div className="text-gray-400 text-sm">
            {stopsLabel}
            {layoverSummary && `, ${layoverSummary}`}
          </div>
          {/* Price */}
          <div className="text-right">
            <div className="text-white text-sm font-medium tracking-tight">
              {flight.price}
            </div>
            <div className="text-gray-500 text-[10px]">{flight.type}</div>
          </div>
          {/* Select Flight Button */}
          {getFlightUrl(flight) && (
            <div className="flex items-center justify-self-end">
              <a
                href={getFlightUrl(flight) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1 rounded border border-white/20 hover:border-white/40 text-white text-xs font-medium transition-colors whitespace-nowrap"
              >
                Select
              </a>
            </div>
          )}
          {/* Chevron */}
          <div
            className={`text-gray-500 text-sm transition-transform duration-200 justify-self-end ${
                expandedSummary[flight.rank] ? "rotate-180" : "rotate-0"
            }`}
          >
            ▼
          </div>
        </div>

        <div 
             className={`transition-all duration-300 ease-in-out overflow-hidden bg-black/20 ${
                isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="p-4 pt-0">
            {/* Flight legs */}
            {flight.legs.map((leg, legIdx) => (
              <div key={legIdx} className="mb-4 pt-4 border-t border-white/5 first:border-0">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-white text-sm font-medium mb-1">
                      {leg.departure}
                    </div>
                    <div className="text-gray-500 text-xs mb-3 font-light">
                      Travel time: {formatDuration(leg.duration_min)}
                    </div>
                    <div className="text-white text-sm font-medium mb-1">
                      {leg.arrival}
                    </div>
                    <div className="text-gray-500 text-xs font-light mt-1">
                      {leg.airline} · {leg.travel_class} · {leg.airplane}
                      {leg.flight_number ? ` · ${leg.flight_number}` : ""}
                      {leg.legroom ? ` · Legroom ${leg.legroom}` : ""}
                    </div>
                  </div>
                </div>
                {flight.layovers && flight.layovers[legIdx] && (
                  <div className="mt-3 text-gray-400 text-xs pl-2 border-l-2 border-white/10">
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
    <div className="bg-transparent text-zinc-100 font-chat selection:bg-white/20 h-screen overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12 p-6 pt-24">
        {/* Search Card */}
        <div className="relative z-10 bg-slate-800/20 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/10">
            <div className="absolute -top-12 left-0 flex gap-4 mb-4">
                {/* Top Dropdowns (Visual Only) */}
                <div className="relative group">
                    <button className="flex items-center gap-2 text-sm font-medium text-white transition-colors bg-white/5 px-3 py-1.5 rounded-md hover:bg-white/10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        {tripType}
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {/* Dropdown Content (Hidden) */}
                </div>
                <div className="relative group">
                    <button className="flex items-center gap-2 text-sm font-medium text-white transition-colors bg-white/5 px-3 py-1.5 rounded-md hover:bg-white/10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {passengers}
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>
                <div className="relative group">
                    <button className="flex items-center gap-2 text-sm font-medium text-white transition-colors bg-white/5 px-3 py-1.5 rounded-md hover:bg-white/10">
                        {cabinClass}
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>
            </div>
            
            <form onSubmit={handleFlightSubmit} className="relative">
                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-2">
                    {/* Origin - Swap - Destination Group */}
                    <div className="flex items-center relative bg-white/5 rounded-md border border-white/10 transition-all">
                        {/* Origin */}
                        <div className="flex-1 relative group rounded-l-md focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-blue-500 focus-within:z-20">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                value={flightForm.departure_id}
                                onChange={(e) => handleFlightChange("departure_id", e.target.value)}
                                required
                                className="w-full bg-transparent border-none py-3.5 pl-10 pr-8 text-white focus:outline-none focus:ring-0 placeholder-gray-500 rounded-l-md"
                                placeholder="Where from?"
                            />
                        </div>

                        {/* Swap Button */}
                        <div className="relative z-30 -ml-3 -mr-3">
                             <button 
                                type="button"
                                onClick={handleSwapAirports}
                                className="p-1.5 rounded-full bg-slate-700 border border-white/10 hover:bg-slate-600 hover:border-white/30 text-gray-300 transition-all shadow-sm"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                             </button>
                        </div>

                        {/* Destination */}
                        <div className="flex-1 relative border-l border-white/5 rounded-r-md focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-orange-500 focus-within:z-20">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                value={flightForm.arrival_id}
                                onChange={(e) => handleFlightChange("arrival_id", e.target.value)}
                                required
                                className="w-full bg-transparent border-none py-3.5 pl-10 pr-4 text-white focus:outline-none focus:ring-0 placeholder-gray-500 rounded-r-md"
                                placeholder="Where to?"
                            />
                        </div>
                    </div>

                    {/* Dates Group */}
                    <div className="flex items-center bg-white/5 rounded-md border border-white/10 transition-all">
                         <div className="flex-1 relative border-r border-white/5 rounded-l-md focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-20">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                             </div>
                             <input
                                type="date"
                                value={flightForm.outbound_date}
                                onChange={(e) => handleFlightChange("outbound_date", e.target.value)}
                                required
                                className="w-full bg-transparent border-none py-3.5 pl-10 pr-2 text-white focus:outline-none focus:ring-0 placeholder-gray-500 appearance-none [&::-webkit-calendar-picker-indicator]:invert rounded-l-md"
                            />
                         </div>
                         <div className="flex-1 relative rounded-r-md focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-20">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                             <input
                                type="date"
                                value={flightForm.return_date}
                                onChange={(e) => handleFlightChange("return_date", e.target.value)}
                                required
                                className="w-full bg-transparent border-none py-3.5 pl-10 pr-2 text-white focus:outline-none focus:ring-0 placeholder-gray-500 appearance-none [&::-webkit-calendar-picker-indicator]:invert rounded-r-md"
                            />
                         </div>
                    </div>
                </div>

                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <button
                        type="submit"
                        disabled={flightLoading}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 shadow-lg
                            ${flightLoading 
                                ? "bg-slate-600 text-white/50 cursor-not-allowed" 
                                : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 hover:-translate-y-0.5"
                            }
                        `}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        {flightLoading ? "Searching..." : "Explore"}
                    </button>
                </div>
            </form>
        </div>

        {flightError && (
          <div className="text-red-400 text-sm border-l-2 border-red-500 pl-4 py-2 bg-red-500/5 rounded-r">
            {flightError}
          </div>
        )}

        {flightResponse && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Departing flights
                </h3>
                {flightResponse.price_insights?.lowest_price != null && (
                  <div className="text-sm text-gray-400">
                    Lowest price from <span className="text-white font-medium">{flightResponse.price_insights.lowest_price} {flightForm.currency}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">
                Sorted by best value
              </div>
            </div>

            <div className="space-y-4">
            {(() => {
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
            
            <div className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                  Prices include required taxes + fees for 1 adult. Optional charges and bag fees may apply. 
                  <a
                    href="https://support.google.com/travel/answer/9771784"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-400 ml-1 underline decoration-gray-700"
                  >
                    Passenger assistance info.
                  </a>
            </div>
          </div>
        )}

        {/* Map Section */}
        {flightResponse?.coordinates && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-medium text-white mb-6 tracking-tight">Route Map</h2>
            {(() => {
              const coords = flightResponse.coordinates;
              
              const hasRoute = coords.departure_airport && coords.arrival_airport;
              const hasAnyCoords = coords.departure_airport || coords.departure_place || coords.arrival_airport || coords.arrival_place;

              if (!hasAnyCoords) {
                return (
                  <div className="p-8 text-center text-gray-600 border border-white/10 rounded-lg">
                    Coordinates not available for this route
                  </div>
                );
              }

              const airportIcon = new L.Icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              });

              const placeIcon = new L.Icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png", // Changed to grey for minimal look
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

              const depAirport = coords.departure_airport;
              const arrAirport = coords.arrival_airport;
              
              const departure = depAirport || coords.departure_place;
              const arrival = arrAirport || coords.arrival_place;

              if (!departure || !arrival) {
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
                const zoom = 25;
                const minZoom = 3;

                return (
                  <div className="h-[400px] w-full rounded-lg overflow-hidden border border-white/10">
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
                        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
                        maxZoom={20}
                        noWrap={true}
                      />
                      {coords.departure_place && (
                        <Marker position={[coords.departure_place.lat, coords.departure_place.lon]} icon={placeIcon}>
                          <Popup>
                            <div className="text-center font-sans text-sm">
                              Departure Place
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.departure_airport && (
                        <Marker position={[coords.departure_airport.lat, coords.departure_airport.lon]} icon={airportIcon}>
                          <Popup>
                            <div className="text-center font-sans text-sm">
                              Departure Airport
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.arrival_place && (
                        <Marker position={[coords.arrival_place.lat, coords.arrival_place.lon]} icon={placeIcon}>
                          <Popup>
                            <div className="text-center font-sans text-sm">
                              Arrival Place
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.arrival_airport && (
                        <Marker position={[coords.arrival_airport.lat, coords.arrival_airport.lon]} icon={airportIcon}>
                          <Popup>
                            <div className="text-center font-sans text-sm">
                              Arrival Airport
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {coords.departure_place && coords.departure_airport && (
                        <Polyline
                          positions={[
                            [coords.departure_place.lat, coords.departure_place.lon],
                            [coords.departure_airport.lat, coords.departure_airport.lon]
                          ]}
                          pathOptions={{
                            color: "#52525b",
                            weight: 1,
                            opacity: 0.5,
                            dashArray: "4, 4",
                          }}
                        />
                      )}
                      {coords.arrival_airport && coords.arrival_place && (
                        <Polyline
                          positions={[
                            [coords.arrival_airport.lat, coords.arrival_airport.lon],
                            [coords.arrival_place.lat, coords.arrival_place.lon]
                          ]}
                          pathOptions={{
                            color: "#52525b",
                            weight: 1,
                            opacity: 0.5,
                            dashArray: "4, 4",
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
              
              const routeStart = depAirport ? [depAirport.lat, depAirport.lon] : [depLat, depLon];
              const routeEnd = arrAirport ? [arrAirport.lat, arrAirport.lon] : [arrLat, arrLon];

              const toRad = (deg: number) => (deg * Math.PI) / 180;

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

              let routePath: [number, number][] = [];
              if (hasRoute && depAirport && arrAirport) {
                routePath = [
                  routeStart as [number, number],
                  routeEnd as [number, number]
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

              const minLat = Math.min(...allCoords.map(c => c[0]));
              const maxLat = Math.max(...allCoords.map(c => c[0]));
              const minLon = Math.min(...allCoords.map(c => c[1]));
              const maxLon = Math.max(...allCoords.map(c => c[1]));
              
              const R = 6371; 
              const latDiff = toRad(maxLat - minLat);
              const lonDiff = toRad(maxLon - minLon);
              const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
                Math.cos(toRad(minLat)) * Math.cos(toRad(maxLat)) *
                Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceKm = R * c;

              let zoom = 5;
              const isFocusingOnArrival = coords.arrival_place || coords.arrival_airport;
              
              if (isFocusingOnArrival) {
                if (distanceKm < 500) zoom = 25;
                else if (distanceKm < 1000) zoom = 22;
                else if (distanceKm < 3000) zoom = 18;
                else zoom = 15;
              } else {
                if (distanceKm < 500) zoom = 11;
                else if (distanceKm < 1000) zoom = 9;
                else if (distanceKm < 3000) zoom = 7;
                else zoom = 5;
              }
              
              const minZoom = 3;

              return (
                <div className="h-[400px] w-full rounded-lg overflow-hidden border border-white/10">
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
                      url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
                      maxZoom={20}
                      noWrap={true}
                    />
                    {coords.departure_place && (
                      <Marker position={[coords.departure_place.lat, coords.departure_place.lon]} icon={placeIcon}>
                        <Popup>
                          <div className="text-center font-sans text-sm">
                            Departure Place
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {coords.departure_airport && (
                      <Marker position={[coords.departure_airport.lat, coords.departure_airport.lon]} icon={airportIcon}>
                        <Popup>
                          <div className="text-center font-sans text-sm">
                            Departure Airport
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {coords.arrival_place && (
                      <Marker position={[coords.arrival_place.lat, coords.arrival_place.lon]} icon={placeIcon}>
                        <Popup>
                          <div className="text-center font-sans text-sm">
                            Arrival Place
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {coords.arrival_airport && (
                      <Marker position={[coords.arrival_airport.lat, coords.arrival_airport.lon]} icon={airportIcon}>
                        <Popup>
                          <div className="text-center font-sans text-sm">
                            Arrival Airport
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {departureConnectionPath.length > 0 && (
                      <Polyline
                        positions={departureConnectionPath}
                        pathOptions={{
                          color: "#71717a",
                          weight: 1,
                          opacity: 0.5,
                          dashArray: "4, 4",
                        }}
                      />
                    )}
                    {routePath.length > 0 && (
                      <Polyline
                        positions={routePath}
                          pathOptions={{
                            color: "#2563eb", // darker blue for light map
                            weight: 2,
                            opacity: 0.8,
                          }}
                      />
                    )}
                    {arrivalConnectionPath.length > 0 && (
                      <Polyline
                        positions={arrivalConnectionPath}
                        pathOptions={{
                          color: "#71717a",
                          weight: 1,
                          opacity: 0.5,
                          dashArray: "4, 4",
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
    </div>
  );
}
