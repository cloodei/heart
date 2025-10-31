import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Check, Info, Loader2, Mars, Venus, X, type LucideProps } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ModelPrediction, requestPredictions } from "@/lib/api";
import { type HeartFeatureValues, HEART_FEATURE_DESCRIPTIONS, defaultHeartFeatures, heartFeatureSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";

const TARGET_LABELS: Record<string, string> = {
  "0": "Không mắc bệnh tim",
  "1": "Có dấu hiệu bệnh tim",
};

type FieldKey = keyof HeartFeatureValues;
type FieldIcon = {
  color: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
}

type FieldOption = {
  value: number;
  label: string;
  description?: string;
  icon?: FieldIcon;
};

type FieldConfig = {
  label: string;
  hint?: string;
  description?: string;
  placeholder?: string;
  type: "number" | "radio" | "select";
  step?: string;
  min?: number;
  max?: number;
  options?: FieldOption[];
};

const FIELD_CONFIG: Record<FieldKey, FieldConfig> = {
  age: {
    label: "Tuổi",
    description: "Độ tuổi hiện tại của bệnh nhân",
    hint: HEART_FEATURE_DESCRIPTIONS.age,
    placeholder: "Ví dụ: 54",
    type: "number",
    step: "1",
    min: 1,
    max: 120,
  },
  sex: {
    label: "Giới tính",
    hint: HEART_FEATURE_DESCRIPTIONS.sex,
    description: "Lựa chọn theo giới tính sinh học",
    type: "radio",
    options: [
      { value: 0, label: "Nữ", icon: { color: "text-pink-500", icon: Venus } },
      { value: 1, label: "Nam", icon: { color: "text-blue-500", icon: Mars } },
    ],
  },
  cp: {
    label: "Phân loại đau ngực",
    hint: HEART_FEATURE_DESCRIPTIONS.cp,
    placeholder: "Chọn loại đau ngực",
    type: "select",
    options: [
      { value: 1, label: "Đau thắt ngực điển hình" },
      { value: 2, label: "Đau thắt ngực không điển hình" },
      { value: 3, label: "Đau không do tim" },
      { value: 4, label: "Không có triệu chứng" },
    ],
  },
  thalach: {
    label: "Nhịp tim tối đa",
    description: "Nhịp tim cao nhất đạt được khi gắng sức",
    hint: HEART_FEATURE_DESCRIPTIONS.thalach,
    placeholder: "Ví dụ: 150",
    type: "number",
    step: "1",
    min: 60,
    max: 250,
  },
  exang: {
    label: "Đau thắt ngực do gắng sức",
    description: "Lựa chọn theo triệu chứng đau ngực khi gắng sức",
    hint: HEART_FEATURE_DESCRIPTIONS.exang,
    type: "radio",
    options: [
      { value: 0, label: "Không", icon: { color: "text-green-500", icon: Check } },
      { value: 1, label: "Có", icon: { color: "text-red-500", icon: X } },
    ],
  },
  oldpeak: {
    label: "Oldpeak",
    description: "Độ chênh ST do gắng sức so với khi nghỉ",
    hint: HEART_FEATURE_DESCRIPTIONS.oldpeak,
    placeholder: "Ví dụ: 1.0",
    type: "number",
    step: "0.1",
    min: 0,
    max: 7,
  },
  slope: {
    label: "Độ dốc ST",
    description: "Độ dốc của đoạn ST khi gắng sức cực đại",
    hint: HEART_FEATURE_DESCRIPTIONS.slope,
    placeholder: "Chọn dạng đường cong",
    type: "select",
    options: [
      { value: 1, label: "Dốc lên (Bình thường)" },
      { value: 2, label: "Phẳng (Thiếu máu nhẹ)" },
      { value: 3, label: "Dốc xuống (Thiếu máu nặng)" },
    ],
  },
  ca: {
    label: "Số mạch máu lớn",
    description: "Số mạch máu lớn (0-3) được nhuộm hiển thị bằng huỳnh quang",
    hint: HEART_FEATURE_DESCRIPTIONS.ca,
    placeholder: "Chọn số lượng mạch",
    type: "select",
    options: [
      { value: 0, label: "Không thấy mạch bất thường" },
      { value: 1, label: "Một mạch" },
      { value: 2, label: "Hai mạch" },
      { value: 3, label: "Ba mạch" },
    ],
  },
  thal: {
    label: "Thalassemia",
    description: "Bệnh tan máu bẩm sinh",
    hint: HEART_FEATURE_DESCRIPTIONS.thal,
    placeholder: "Chọn kết quả thalassemia",
    type: "select",
    options: [
      { value: 3, label: "Bình thường" },
      { value: 6, label: "Tổn thương cố định" },
      { value: 7, label: "Tổn thương hồi phục" },
    ],
  },
};

const FIELD_GROUPS: Array<{ title: string; description: string; fields: FieldKey[] }> = [
  {
    title: "Thông tin cơ bản",
    description: "Những đặc trưng nền tảng của bệnh nhân.",
    fields: ["age", "sex", "cp"],
  },
  {
    title: "Chỉ số gắng sức",
    description: "Các chỉ số đo lường được trong bài kiểm tra gắng sức.",
    fields: ["thalach", "exang", "oldpeak", "slope"],
  },
  {
    title: "Hình ảnh và xét nghiệm bổ sung",
    description: "Kết quả từ chụp mạch và xét nghiệm thalassemia.",
    fields: ["ca", "thal"],
  },
];

function formatPercent(value?: number) {
  if (value === undefined || Number.isNaN(value))
    return "-";

  return `${(value * 100).toFixed(1)}%`;
}

export function Predictor() {
  const [results, setResults] = useState<ModelPrediction[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<HeartFeatureValues>({
    resolver: zodResolver(heartFeatureSchema),
    defaultValues: defaultHeartFeatures,
  });

  const resetForm = () => {
    reset(defaultHeartFeatures);
    setResults(null);
    setServerError(null);
  };

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

  const positiveModelCount = results?.reduce((count, model) => {
    const label = model.predictions[0]?.label;
    return label === 1 ? count + 1 : count;
  }, 0) ?? 0;

  const totalModels = results?.length ?? 0;
  const globalSummary = (() => {
    if (totalModels === 0)
      return null;

    if (positiveModelCount === 0) {
      return {
        text: `Tất cả ${totalModels} mô hình dự đoán không có dấu hiệu bệnh tim.`,
        tone: "text-emerald-600 dark:text-emerald-300",
      } as const;
    }

    if (positiveModelCount === totalModels) {
      return {
        text: "Tất cả mô hình đều dự đoán có dấu hiệu bệnh tim!",
        tone: "text-red-500 dark:text-red-300",
      } as const;
    }

    return {
      text: `${positiveModelCount}/${totalModels} mô hình cảnh báo có nguy cơ...`,
      tone: "text-amber-600 dark:text-amber-500",
    } as const;
  })();

  useEffect(() => {
    if (results && results.length > 0) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultsRef.current?.focus({ preventScroll: true });
    }
  }, [results]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Card className="gap-3 bg-card backdrop-blur">
        <CardHeader>
          <CardDescription>
            Nhập các chỉ số lâm sàng để nhận đánh giá từ các mô hình Hồi Quy Logistic, Cây Quyết Định và KNN.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              {FIELD_GROUPS.map((group) => (
                <fieldset
                  key={group.title}
                  className="space-y-5 rounded-xl border border-border/60 bg-muted/10 p-4 pt-0 shadow-sm"
                >
                  <legend className="mb-0.5 font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </legend>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <Controller
                        key={field}
                        control={control}
                        name={field}
                        render={({ field: controllerField, fieldState }) => {
                          const config = FIELD_CONFIG[field];
                          const describedBy = config.hint ? `${field}-hint` : undefined;

                          return (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label htmlFor={field} className="text-sm font-medium text-foreground">
                                  {config.label}
                                </label>
                                {config.description && (
                                  <p className="text-xs font-light tracking-tight text-muted-foreground">{config.description}</p>
                                )}
                              </div>

                              {config.type === "number" && (
                                <Input
                                  id={field}
                                  type="number"
                                  inputMode="decimal"
                                  step={config.step}
                                  min={config.min}
                                  max={config.max}
                                  placeholder={config.placeholder}
                                  value={controllerField.value ?? ""}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    controllerField.onChange(value === "" ? undefined : Number(value));
                                  }}
                                  onBlur={controllerField.onBlur}
                                  ref={controllerField.ref}
                                  aria-invalid={fieldState.invalid}
                                  aria-describedby={describedBy}
                                />
                              )}

                              {config.type === "radio" && (
                                <div className="flex flex-wrap gap-3">
                                  {config.options?.map((option) => {
                                    const isSelected = Number(controllerField.value) === option.value;
                                    return (
                                      <label key={option.value} className="cursor-pointer">
                                        <Input
                                          type="radio"
                                          className="peer sr-only"
                                          value={option.value}
                                          checked={isSelected}
                                          onChange={() => controllerField.onChange(option.value)}
                                          onBlur={controllerField.onBlur}
                                          aria-invalid={fieldState.invalid}
                                          aria-describedby={describedBy}
                                        />
                                        {option.icon && (
                                          <option.icon.icon strokeWidth={2.5} className={cn(
                                            "size-[26px] transition-colors duration-300",
                                            isSelected ? option.icon.color : "text-gray-500"
                                          )} />
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {config.type === "select" && (
                                <Select
                                  value={
                                    controllerField.value !== undefined
                                      ? String(controllerField.value)
                                      : ""
                                  }
                                  onValueChange={(value) => controllerField.onChange(Number(value))}
                                >
                                  <SelectTrigger
                                    id={field}
                                    aria-invalid={fieldState.invalid}
                                    aria-describedby={describedBy}
                                    className="w-full"
                                  >
                                    <SelectValue placeholder={config.placeholder ?? "Chọn giá trị"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {config.options?.map((option) => (
                                      <SelectItem key={option.value} value={String(option.value)}>
                                        <span className="flex flex-col gap-0.5">
                                          {option.description && (
                                            <span className="text-xs text-muted-foreground">
                                              {option.description}
                                            </span>
                                          )}
                                          <span className="font-medium">{option.label}</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {fieldState.error && (
                                <p className="text-sm text-destructive">{fieldState.error.message}</p>
                              )}
                            </div>
                          );
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4" />
                <span>
                  Kết quả ở dạng nhị phân (0 = bình thường, 1 = mắc bệnh). Mỗi mô hình cung cấp nhận xét và gợi ý
                  hành động giúp bạn trao đổi cùng chuyên gia. (LƯU Ý: Kết quả chỉ mang tính tham khảo!!)
                </span>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-linear-to-b from-emerald-400 to-emerald-600 font-medium text-neutral-100"
                >
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
            <div
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {serverError}
            </div>
          )}

          {results && (
            <div ref={resultsRef} tabIndex={-1} className="space-y-5 focus:outline-none">
              {globalSummary && (
                <p className={cn("font-semibold", globalSummary.tone)}>{globalSummary.text}</p>
              )}

              <div>
                <h3 className="mb-0.5 text-lg font-medium">Kết quả theo mô hình</h3>
                <ul className="space-y-2">
                  {results.map((model) => {
                    const firstPrediction = model.predictions[0];
                    if (!firstPrediction)
                      return null;

                    const labelMeaning = TARGET_LABELS[String(firstPrediction.label)] ?? "Không rõ";
                    const isPositive = firstPrediction.label === 1;
                    const StatusIcon = isPositive ? X : Check;
                    const toneClasses = isPositive
                      ? {
                        icon: "border-red-500 text-red-500",
                        row: "border-red-500/40 bg-red-500/5",
                        pill: "bg-red-500/10 text-red-600 dark:text-red-300",
                      }
                      : {
                        icon: "border-emerald-500 text-emerald-500",
                        row: "border-emerald-500/40 bg-emerald-500/5",
                        pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                      } as const;

                    return (
                      <li
                        key={model.model}
                        className={cn(
                          "flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm shadow-sm",
                          toneClasses.row
                        )}
                      >
                        <div className="flex flex-1 items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex size-8 items-center justify-center rounded-full border text-base",
                              toneClasses.icon
                            )}
                          >
                            <StatusIcon className="size-4" />
                          </span>
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-semibold text-foreground">{model.model}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {labelMeaning}
                              <span className="ml-3.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                                Label {firstPrediction.label}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                          <span className={cn("inline-flex items-center gap-2 rounded-full px-2 py-0.5 font-semibold", toneClasses.pill)}>
                            {isPositive ? "Cảnh báo" : "Bình thường"}
                          </span>
                          {typeof model.metrics.accuracy === "number" && (
                            <span className="text-muted-foreground">Độ chính xác {formatPercent(model.metrics.accuracy)}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
