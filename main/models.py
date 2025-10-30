import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from typing import Any, Dict, List, Optional, Tuple

root = pd.read_csv("processed_cleveland.csv")
df = root.replace('?', np.nan).dropna().astype(float)
df['target'] = (df['num'] > 0).astype(int)

FEATURE_COLUMNS: List[str] = [
  'age',
  'sex',
  'cp',
  'thalach',
  'exang',
  'oldpeak',
  'slope',
  'ca',
  'thal'
]

TARGET_COLUMN = 'target'

X = df[FEATURE_COLUMNS]
y = df[TARGET_COLUMN]

X_train, X_test, y_train, y_test = train_test_split(
  X, y,
  test_size=0.2,
  stratify=y,
  random_state=42
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


def _ensure_feature_frame(data: Any) -> pd.DataFrame:
  if isinstance(data, pd.DataFrame):
    frame = data.copy()
  elif isinstance(data, dict):
    frame = pd.DataFrame([data])
  else:
    arr = np.asarray(data, dtype=float)
    if arr.ndim == 1:
      arr = arr.reshape(1, -1)
    if arr.shape[1] != len(FEATURE_COLUMNS):
      raise ValueError(
        f'Expected {len(FEATURE_COLUMNS)} feature values, but received shape {arr.shape}.'
      )
    frame = pd.DataFrame(arr, columns=FEATURE_COLUMNS)
  return frame[FEATURE_COLUMNS].astype(float)


def _coerce_label(value: Any) -> Any:
  if isinstance(value, np.generic):
    return value.item()
  return value


class Model:
  def __init__(self, name: str, model: Any, metrics: Optional[Dict[str, float]] = None):
    self.name = name
    self.model = model
    self.metrics = metrics or {}

  def _transform(self, X: Any) -> Tuple[pd.DataFrame, np.ndarray]:
    frame = _ensure_feature_frame(X)
    X_scaled = scaler.transform(frame)
    return frame, X_scaled

  def predict(self, X: Any):
    _, X_scaled = self._transform(X)
    return self.model.predict(X_scaled)

  def predict_proba(self, X: Any):
    if not hasattr(self.model, 'predict_proba'):
      return None
    _, X_scaled = self._transform(X)
    return self.model.predict_proba(X_scaled)

  def predict_with_details(self, X: Any):
    frame, X_scaled = self._transform(X)
    predictions = self.model.predict(X_scaled)
    probabilities = None
    if hasattr(self.model, 'predict_proba'):
      probabilities = self.model.predict_proba(X_scaled)
    classes = list(getattr(self.model, 'classes_', [])) if probabilities is not None else []

    details = []
    for index, raw_pred in enumerate(predictions):
      pred_label = _coerce_label(raw_pred)
      entry: Dict[str, Any] = {
        'label': pred_label,
      }

      if probabilities is not None:
        probs = probabilities[index]
        prob_map = {
          str(_coerce_label(classes[class_index])): float(prob_value)
          for class_index, prob_value in enumerate(probs)
        }
        entry['confidence'] = max(prob_map.values())
        entry['probabilities'] = prob_map

      details.append(entry)

    return details

knn = KNeighborsClassifier(3)
knn.fit(X_train_scaled, y_train)

dec_tree = DecisionTreeClassifier(
  criterion='gini',
  max_depth=3,
  random_state=42
)
dec_tree.fit(X_train_scaled, y_train)

logistic = LogisticRegression(
  solver='liblinear',
  max_iter=1000,
  random_state=42
)
logistic.fit(X_train_scaled, y_train)

MODELS = [
  Model(
    "KNN",
    knn,
    metrics={
      'accuracy': float(accuracy_score(y_test, knn.predict(X_test_scaled)))
    }
  ),
  Model(
    "Decision Tree",
    dec_tree,
    metrics={
      'accuracy': float(accuracy_score(y_test, dec_tree.predict(X_test_scaled)))
    }
  ),
  Model(
    "Logistic Regression",
    logistic,
    metrics={
      'accuracy': float(accuracy_score(y_test, logistic.predict(X_test_scaled)))
    }
  )
]
