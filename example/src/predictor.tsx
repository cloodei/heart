import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, Info, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ModelPrediction, requestPredictions } from "@/lib/api";
import { type HeartFeatureValues, HEART_FEATURE_DESCRIPTIONS, defaultHeartFeatures, heartFeatureSchema } from "@/lib/schema";

const TARGET_LABELS: Record<string, string> = {
  "0": "No Heart Disease",
  "1": "Heart Disease",
};

const FIELD_CONFIG = {
  age: {
    label: "Age",
    hint: HEART_FEATURE_DESCRIPTIONS.age,
    step: "1",
    min: 1,
    max: 120,
  },
  sex: {
    label: "Sex",
    hint: HEART_FEATURE_DESCRIPTIONS.sex,
    step: "1",
    min: 0,
    max: 1,
  },
  cp: {
    label: "Chest Pain Type",
    hint: HEART_FEATURE_DESCRIPTIONS.cp,
    step: "1",
    min: 1,
    max: 4,
  },
  thalach: {
    label: "Max Heart Rate",
    hint: HEART_FEATURE_DESCRIPTIONS.thalach,
    step: "1",
    min: 60,
    max: 250,
  },
  exang: {
    label: "Exercise-Induced Angina",
    hint: HEART_FEATURE_DESCRIPTIONS.exang,
    step: "1",
    min: 0,
    max: 1,
  },
  oldpeak: {
    label: "Oldpeak",
    hint: HEART_FEATURE_DESCRIPTIONS.oldpeak,
    step: "0.1",
    min: 0,
    max: 7,
  },
  slope: {
    label: "Slope",
    hint: HEART_FEATURE_DESCRIPTIONS.slope,
    step: "1",
    min: 1,
    max: 3,
  },
  ca: {
    label: "Major Vessels",
    hint: HEART_FEATURE_DESCRIPTIONS.ca,
    step: "1",
    min: 0,
    max: 3,
  },
  thal: {
    label: "Thalassemia",
    hint: HEART_FEATURE_DESCRIPTIONS.thal,
    step: "1",
    min: 0,
    max: 7,
  },
} as const;

function formatPercent(value?: number) {
  if (value === undefined || Number.isNaN(value))
    return "-";

  return `${(value * 100).toFixed(1)}%`;
}

function formatConfidence(value?: number) {
  if (value === undefined || Number.isNaN(value))
    return "Not available";

  return `${(value * 100).toFixed(2)}%`;
}

export function Predictor() {
  const [results, setResults] = useState<ModelPrediction[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HeartFeatureValues>({
    resolver: zodResolver(heartFeatureSchema),
    defaultValues: defaultHeartFeatures,
  });

  const onSubmit = async (values: HeartFeatureValues) => {
    setServerError(null);
    setResults(null);

    try {
      const response = await requestPredictions([values]);
      setResults(response);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Prediction failed";
      setServerError(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Card className="border-border/70 bg-card backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            Predict Heart Disease Risk
          </CardTitle>
          <CardDescription>
            Provide patient measurements and compare outputs from logistic regression, decision tree, and k-nearest neighbours models.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {Object.entries(FIELD_CONFIG).map(([field, config]) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium" htmlFor={field}>
                    {config.label}
                  </label>
                  <Input
                    id={field}
                    type="number"
                    step={config.step}
                    min={config.min}
                    max={config.max}
                    aria-invalid={errors[field as keyof HeartFeatureValues] ? "true" : "false"}
                    {...register(field as keyof HeartFeatureValues)}
                  />
                  <p className="text-xs text-muted-foreground">{config.hint}</p>
                  {errors[field as keyof HeartFeatureValues] && (
                    <p className="text-sm text-destructive">
                      {errors[field as keyof HeartFeatureValues]?.message as string}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                Outputs are binary (0 = healthy, 1 = heart disease). Confidence is derived from the model's probabilities when available.
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => reset(defaultHeartFeatures)}>
                  Reset defaults
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Predicting...
                    </span>
                  ) : (
                    "Predict"
                  )}
                </Button>
              </div>
            </div>
          </form>

          {serverError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {serverError}
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Model predictions</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {results.map((model) => {
                  const firstPrediction = model.predictions[0];
                  if (!firstPrediction)
                    return null;

                  const probabilityEntries = Object.entries(firstPrediction.probabilities ?? {});

                  return (
                    <Card key={model.model} className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-xl">{model.model}</CardTitle>
                        <CardDescription>
                          Accuracy: {formatPercent(model.metrics.accuracy ?? undefined)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border bg-background/50 p-4">
                          <p className="text-sm text-muted-foreground">Predicted class</p>
                          <p className="text-2xl font-semibold">
                            {firstPrediction.label} · {TARGET_LABELS[String(firstPrediction.label)] ?? "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Confidence: {formatConfidence(firstPrediction.confidence)}
                          </p>
                        </div>

                        {probabilityEntries.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Probability distribution</p>
                            <div className="space-y-2">
                              {probabilityEntries.map(([label, probability]) => (
                                <div key={label} className="flex items-center justify-between rounded-md border bg-background/40 px-3 py-2 text-sm">
                                  <span>{label} · {TARGET_LABELS[label] ?? "Unknown"}</span>
                                  <span className="font-semibold">{formatPercent(probability)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
