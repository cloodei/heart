import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ModelPrediction, requestPredictions } from "@/lib/api";
import { type HeartFeatureValues, HEART_FEATURE_DESCRIPTIONS, defaultHeartFeatures, heartFeatureSchema } from "@/lib/schema";

const TARGET_LABELS: Record<string, string> = {
  "0": "Không mắc bệnh tim",
  "1": "Có dấu hiệu bệnh tim",
};

const FIELD_CONFIG = {
  age: {
    label: "Tuổi",
    hint: HEART_FEATURE_DESCRIPTIONS.age,
    step: "1",
    min: 1,
    max: 120,
  },
  sex: {
    label: "Giới tính",
    hint: HEART_FEATURE_DESCRIPTIONS.sex,
    step: "1",
    min: 0,
    max: 1,
  },
  cp: {
    label: "Phân loại đau ngực",
    hint: HEART_FEATURE_DESCRIPTIONS.cp,
    step: "1",
    min: 1,
    max: 4,
  },
  thalach: {
    label: "Nhịp tim tối đa",
    hint: HEART_FEATURE_DESCRIPTIONS.thalach,
    step: "1",
    min: 60,
    max: 250,
  },
  exang: {
    label: "Đau thắt ngực do gắng sức",
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
    label: "Độ dốc ST",
    hint: HEART_FEATURE_DESCRIPTIONS.slope,
    step: "1",
    min: 1,
    max: 3,
  },
  ca: {
    label: "Số mạch vành lớn",
    hint: HEART_FEATURE_DESCRIPTIONS.ca,
    step: "1",
    min: 0,
    max: 3,
  },
  thal: {
    label: "Thalassemia",
    hint: HEART_FEATURE_DESCRIPTIONS.thal,
    step: "1",
    min: 3,
    max: 7,
  }
} as const;

function formatPercent(value?: number) {
  if (value === undefined || Number.isNaN(value))
    return "-";

  return `${(value * 100).toFixed(1)}%`;
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
      const message = error instanceof Error ? error.message : "Dự đoán thất bại";
      setServerError(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Card className="bg-card backdrop-blur gap-3">
        <CardHeader>
          <CardDescription>
            Nhập các chỉ số bệnh nhân và so sánh kết quả từ các mô hình Hồi Quy Logistic, Cây Quyết Định và KNN.
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
                <Info className="size-4" />
                Kết quả ở dạng nhị phân (0 = bình thường, 1 = mắc bệnh). Độ tin cậy được tính từ xác suất của từng mô hình (nếu có).
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => reset(defaultHeartFeatures)}>
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-linear-to-b from-emerald-400 to-emerald-600 text-neutral-100 font-medium">
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Đang dự đoán...
                    </span>
                  ) : (
                    "Dự đoán"
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
              <h3 className="text-lg font-semibold">Kết quả theo từng mô hình</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {results.map((model) => {
                  const firstPrediction = model.predictions[0];
                  if (!firstPrediction)
                    return null;

                  return (
                    <Card key={model.model} className="border-border/60 bg-card">
                      <CardHeader>
                        <CardTitle className="text-xl">{model.model}</CardTitle>
                        <CardDescription>
                          Độ chính xác của mô hình: {formatPercent(model.metrics.accuracy ?? undefined)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nhãn dự đoán</p>
                          <p className="text-2xl font-semibold">
                            {firstPrediction.label} - {TARGET_LABELS[String(firstPrediction.label)] ?? "Không rõ"}
                          </p>
                        </div>
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
