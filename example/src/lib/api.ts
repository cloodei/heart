export type HeartFeatures = {
  age: number;
  sex: number;
  cp: number;
  thalach: number;
  exang: number;
  oldpeak: number;
  slope: number;
  ca: number;
  thal: number;
}

export type ModelPrediction = {
  model: string;
  metrics: Record<string, number>;
  predictions: Array<{
    label: number;
    confidence?: number;
    probabilities?: Record<string, number>;
  }>;
}

export type PredictionResponse = {
  feature_order: string[];
  records: HeartFeatures[];
  results: ModelPrediction[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function parseJson<T>(response: Response): Promise<T> {
  try {
    const get = await response.json();
    return get as T;
  }
  catch (error) {
    throw new Error("Failed to parse server response");
  }
}

export async function fetchModels() {
  const response = await fetch(`${API_BASE}/models`);

  if (!response.ok) {
    throw new Error(`Failed to load models (${response.status})`);
  }

  return parseJson<{
    feature_order: string[];
    models: Array<{
      name: string;
      metrics: Record<string, number>;
      supports_probabilities: boolean;
    }>;
  }>(response);
}

export async function requestPredictions(records: HeartFeatures[]) {
  const response = await fetch(`${API_BASE}/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.detail || errorBody?.error || "Prediction request failed";
    throw new Error(message);
  }

  return parseJson<ModelPrediction[]>(response);
}
