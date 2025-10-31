from typing import Any, Dict, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from models import FEATURE_COLUMNS, MODELS
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)

class HeartFeatures(BaseModel):
  age: float = Field(..., ge=0, description="Age in years")
  sex: int = Field(..., ge=0, le=1, description="Sex (1 = male, 0 = female)")
  cp: int = Field(..., ge=0, le=4, description="Chest pain type (0-4)")
  thalach: float = Field(..., ge=0, description="Maximum heart rate achieved")
  exang: int = Field(..., ge=0, le=1, description="Exercise-induced angina (1 = yes)")
  oldpeak: float = Field(..., ge=0, description="ST depression induced by exercise")
  slope: int = Field(..., ge=0, le=3, description="Slope of the peak exercise ST segment")
  ca: int = Field(..., ge=0, le=4, description="Number of major vessels (0-4)")
  thal: int = Field(..., ge=0, le=7, description="Thalassemia (3 = normal, 6 = fixed defect, 7 = reversible defect)")


class PredictRequest(BaseModel):
  records: List[HeartFeatures] = Field(
    ...,
    min_length=1,
    description="List of patient records to score"
  )


def _format_prediction_detail(detail: Dict[str, Any]) -> Dict[str, Any]:
  response = {
    'label': detail['label'],
  }
  if 'confidence' in detail:
    response['confidence'] = detail['confidence']
  if 'probabilities' in detail:
    response['probabilities'] = detail['probabilities']
  return response


@app.get("/models")
def list_models():
  return {
    'feature_order': FEATURE_COLUMNS,
    'models': [
      {
        'name': model.name,
        'metrics': model.metrics,
        'supports_probabilities': hasattr(model.model, 'predict_proba')
      }
      for model in MODELS
    ]
  }


@app.post("/predictions")
def predict(payload: PredictRequest):
  inputs = [record.model_dump() for record in payload.records]

  try:
    response_payload = []
    for model in MODELS:
      details = model.predict_with_details(inputs)
      response_payload.append({
        'model': model.name,
        'metrics': model.metrics,
        'predictions': [
          _format_prediction_detail(detail)
          for detail in details
        ]
      })
  except ValueError as exc:
    raise HTTPException(status_code=422, detail=str(exc)) from exc

  return response_payload


@app.get("/health")
def health_check():
  return {'status': 'ok'}
