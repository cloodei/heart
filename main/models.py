import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import StackingClassifier
from sklearn.linear_model import LogisticRegression

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

X_train_handled = X_train.copy()
X_test_handled = X_test.copy()

continuous_features = ['age','thalach', 'oldpeak'] 
for col in continuous_features:
    Q1 = X_train_handled[col].quantile(0.25)
    Q3 = X_train_handled[col].quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    X_train_handled[col] = X_train_handled[col].clip(lower_bound, upper_bound)
    X_test_handled[col] = X_test_handled[col].clip(lower_bound, upper_bound)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_handled)
X_test_scaled = scaler.transform(X_test_handled)


class Model:
  def __init__(self, name: str, model: Any, metrics: Optional[Dict[str, float]] = None):
    self.name = name
    self.model = model
    self.metrics = metrics or {}

  def _scale(self, records: List[Dict[str, Any]]) -> np.ndarray:
    if not records:
      raise ValueError('No input records provided.')

    frame = pd.DataFrame(records)
    missing = [column for column in FEATURE_COLUMNS if column not in frame.columns]
    if missing:
      raise ValueError(f'Missing features: {", ".join(missing)}')

    try:
      numeric = frame[FEATURE_COLUMNS].astype(float)
    except ValueError as exc:
      raise ValueError('All feature values must be numeric.') from exc

    return scaler.transform(numeric)

  def predict(self, records: List[Dict[str, Any]]):
    X_scaled = self._scale(records)
    return self.model.predict(X_scaled)

  def predict_proba(self, records: List[Dict[str, Any]]):
    if not hasattr(self.model, 'predict_proba'):
      return None
    X_scaled = self._scale(records)
    return self.model.predict_proba(X_scaled)

  def predict_with_details(self, records: List[Dict[str, Any]]):
    X_scaled = self._scale(records)
    predictions = self.model.predict(X_scaled)
    probabilities = self.model.predict_proba(X_scaled) if hasattr(self.model, 'predict_proba') else None
    classes = list(getattr(self.model, 'classes_', [])) if probabilities is not None else []

    details = []
    for index, raw_pred in enumerate(predictions):
      pred_label = raw_pred.item() if isinstance(raw_pred, np.generic) else raw_pred
      entry: Dict[str, Any] = {
        'label': pred_label,
      }

      if probabilities is not None:
        probs = probabilities[index]
        prob_map = {
          str(classes[class_index].item() if isinstance(classes[class_index], np.generic) else classes[class_index]): float(prob_value)
          for class_index, prob_value in enumerate(probs)
        }
        entry['confidence'] = max(prob_map.values())
        entry['probabilities'] = prob_map

      details.append(entry)

    return details

knn = KNeighborsClassifier(3)
knn.fit(X_train_scaled, y_train)

dec_tree = DecisionTreeClassifier(
  criterion='entropy',
  max_depth=3,     
  random_state=42
)
dec_tree.fit(X_train_scaled, y_train)

logistic = LogisticRegression(
  solver='liblinear',
  penalty="l2",
  C=0.01,
  random_state=42,
  max_iter=10000
)
logistic.fit(X_train_scaled, y_train)

meta_model = LogisticRegression(C=0.01, solver='liblinear', penalty='l2',max_iter=1000)

stacking_model = StackingClassifier(
  estimators=[
    ('knn', knn),
    ('decision_tree', dec_tree),
    ('logistic_regression', logistic)
  ],
  final_estimator=meta_model,
  passthrough=False,
  cv=5
)

stacking_model.fit(X_train_scaled, y_train)

MODELS = [
  Model(
    "KNN",
    knn,
    metrics={
      'accuracy': float(accuracy_score(y_test, knn.predict(X_test_scaled)))
    }
  ),
  Model(
    "Stacking Classifier",
    stacking_model,
    metrics={
      'accuracy': float(accuracy_score(y_test, stacking_model.predict(X_test_scaled)))
    }
  ),
  Model(
    "Logistic Regression",
    logistic,
    metrics={
      'accuracy': float(accuracy_score(y_test, logistic.predict(X_test_scaled)))
    }
  ),
  Model(
    "Decision Tree",
    dec_tree,
    metrics={
      'accuracy': float(accuracy_score(y_test, dec_tree.predict(X_test_scaled)))
    }
  ),
]
