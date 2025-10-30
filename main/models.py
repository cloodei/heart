import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import classification_report
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

root = pd.read_csv("processed_cleveland.csv")
df = root.dropna()
df['target'] = (df['num'] > 0).astype(int)

X = df.drop(columns=['trestbps', 'chol', 'fbs', 'restecg', 'target', 'num'])
y = df['target']

X_train, X_test, y_train, y_test = train_test_split(
  X, y, test_size=0.2, stratify=y, random_state=42
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


MODELS = []

knn = KNeighborsClassifier(5)
knn.fit(X_train_scaled, y_train)
knn_preds = knn.predict(X_test_scaled)

dec_tree = DecisionTreeClassifier(
  max_depth=10,
  criterion='gini',
  random_state=42
)
dec_tree.fit(X_train_scaled, y_train)
dec_tree_preds = dec_tree.predict(X_test_scaled)

rf = RandomForestClassifier(
  n_estimators=100,
  max_depth=5,
  criterion='gini',
  random_state=42
)
rf.fit(X_train_scaled, y_train)
rf_preds = rf.predict(X_test_scaled)

print(classification_report(y_test, knn_preds))
