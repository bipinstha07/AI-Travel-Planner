// src/types/travel.ts
export interface Hotel {
    name: string;
    price_per_night: string;
    link: string;
    hotel_class: number;
  }
  
  export interface Day {
    day: string;
    description: string;
  }
  
  export interface LocationData {
    place_results?: {
      title: string;
      description?: { snippet?: string };
      images?: Array<{
        title: string;
        thumbnail?: string;
        serpapi_thumbnail?: string;
      }>;
      weather?: {
        celsius: string;
        fahrenheit: string;
        conditions: string;
      };
      address?: string;
      gps_coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  }
  
  export interface FlightCoordinates {
    departure_place?: { lat: number; lon: number };
    departure_airport?: { lat: number; lon: number };
    arrival_place?: { lat: number; lon: number };
    arrival_airport?: { lat: number; lon: number };
  }
  
  export interface AirportRef {
    name: string;
    id: string;
    time: string; // "YYYY-MM-DD HH:MM"
  }
  
  export interface BestFlightLeg {
    departure_airport: AirportRef;
    arrival_airport: AirportRef;
    duration: number;
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
  
  export interface LayoverInfo {
    duration: number;
    name: string;
    id: string;
    overnight?: boolean;
  }
  
  export interface BestFlightOption {
    flights: BestFlightLeg[];
    layovers?: LayoverInfo[];
    total_duration: number;
    carbon_emissions?: {
      this_flight: number;
      typical_for_this_route: number;
      difference_percent: number;
    };
    price?: number;
    type?: string;
    airline_logo?: string;
    departure_token?: string;
  }
  
  export interface FlightsData {
    coordinates?: FlightCoordinates;
    best_flights?: BestFlightOption[];
    other_flights?: BestFlightOption[];
    summary?: {
      flights?: Array<{
        rank: number;
        route: string;
        type: string;
        price: string;
        total_duration_min: number;
        layovers?: string[];
        legs: Array<{
          airline: string;
          flight_number: string;
          departure: string;
          arrival: string;
          duration_min: number;
          airplane: string;
          travel_class: string;
          legroom?: string;
          airline_logo?: string;
        }>;
        airline_logo?: string;
      }>;
    };
    search_metadata?: {
      google_flights_url?: string;
    };
    price_insights?: {
      lowest_price?: number;
    };
    [key: string]: any;
  }
  
  export interface ItineraryData {
    destination: string;
    trip_type: string;
    budget: string;
    dates: string;
    departure_city?: string;
    hotels?: Hotel[];
    days: Day[];
    location?: LocationData;
    flights?: FlightsData;
  }
  
  export interface ItineraryResponse {
    itinerary: ItineraryData;
  }
  
  export interface Message {
    id: number;
    text: string;
    isUser: boolean;
    timestamp: Date;
  }
  
  export interface ChatResponse {
    reply: string;
    itinerary?: string | { itinerary: string };
    variables: {
      destination: string | null;
      start_date: string | null;
      num_days: string | null;
      budget: string | null;
      departure_city: string | null;
      trip_type: string | null;
    };
    done: boolean;
  }
  