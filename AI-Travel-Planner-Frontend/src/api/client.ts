const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export type IntentRequest = {
  text: string;
  candidate_labels?: string[];
};

export type IntentResponse = {
  label: string;
  confidence: number;
  scores: Record<string, number>;
};

export async function classifyIntent(req: IntentRequest): Promise<IntentResponse> {
  const res = await fetch(`${API_BASE}/api/recommendations/classify-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: req.text,
      candidate_labels: req.candidate_labels ?? ["beach", "mountains", "city", "food", "culture"],
    }),
  });
  if (!res.ok) throw new Error(`Classify failed: ${res.status}`);
  return res.json();
}

export type ItineraryRequest = {
  destination: string;
  days: number;
  preferences?: string[];
};

export type ItineraryDay = {
  date?: string | null;
  activities: string[];
  food: string[];
  sights: string[];
};

export type ItineraryResponse = {
  days: ItineraryDay[];
  notes?: string;
};

export async function generateItinerary(req: ItineraryRequest): Promise<ItineraryResponse> {
  const res = await fetch(`${API_BASE}/api/itinerary/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: req.destination,
      days: req.days,
      preferences: req.preferences ?? [],
    }),
  });
  if (!res.ok) throw new Error(`Itinerary failed: ${res.status}`);
  return res.json();
}

export type DestinationItem = {
  name: string;
  country: string;
  tags: string[];
  best_months: string[];
  description?: string;
};

export type DestinationListResponse = {
  items: DestinationItem[];
};

export async function listDestinations(params?: { tag?: string; month?: string; limit?: number }): Promise<DestinationListResponse> {
  const url = new URL(`${API_BASE}/api/recommendations/destinations`);
  if (params?.tag) url.searchParams.set('tag', params.tag);
  if (params?.month) url.searchParams.set('month', params.month);
  url.searchParams.set('limit', String(params?.limit ?? 24));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`List destinations failed: ${res.status}`);
  return res.json();
}

export type PlanResponse = {
  intent: string;
  recommendations: string[];
};

export async function plan(text: string): Promise<PlanResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${API_BASE}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Plan failed: ${res.status}`);
    return await res.json();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Plan request timed out. Please try again.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}