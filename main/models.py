import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression

root = pd.read_csv("processed_cleveland.csv")
df = root.replace('?', np.nan).dropna().astype(float)
df['target'] = (df['num'] > 0).astype(int)

X = df.drop(columns=['trestbps', 'chol', 'fbs', 'restecg', 'target', 'num'])
y = df['target']

X_train, X_test, y_train, y_test = train_test_split(
  X, y,
  test_size=0.2,
  stratify=y,
  random_state=42
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


class Model:
  def __init__(self, name: str, model: any):
    self.name = name
    self.model = model
  
  def predict(self, X: any):
    return self.model.predict(scaler.transform(X))

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
  Model("KNN", knn),
  Model("Decision Tree", dec_tree),
  Model("Logistic Regression", logistic)
]
