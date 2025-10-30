import { z } from "zod";

export const heartFeatureSchema = z.object({
  age: z.coerce
    .number()
    .min(1, "Age must be positive")
    .max(120, "Age seems unrealistic"),
  sex: z.coerce
    .number()
    .int("Sex must be an integer")
    .min(0)
    .max(1, "Use 0 for female, 1 for male"),
  cp: z.coerce
    .number()
    .int("Chest pain type must be an integer")
    .min(0)
    .max(4),
  thalach: z.coerce
    .number()
    .min(60, "Value seems too low")
    .max(250, "Value seems too high"),
  exang: z.coerce
    .number()
    .int("Value must be an integer")
    .min(0)
    .max(1),
  oldpeak: z.coerce
    .number()
    .min(0)
    .max(7, "Value seems too high"),
  slope: z.coerce
    .number()
    .int("Slope must be an integer")
    .min(0)
    .max(3),
  ca: z.coerce
    .number()
    .int("Value must be an integer")
    .min(0)
    .max(4),
  thal: z.coerce
    .number()
    .int("Value must be an integer")
    .min(0)
    .max(7),
});

export type HeartFeatureValues = z.infer<typeof heartFeatureSchema>;

export const defaultHeartFeatures: HeartFeatureValues = {
  age: 54,
  sex: 1,
  cp: 1,
  thalach: 150,
  exang: 0,
  oldpeak: 1.0,
  slope: 2,
  ca: 0,
  thal: 3,
};

export const HEART_FEATURE_DESCRIPTIONS = {
  age: "Age (years)",
  sex: "Sex (0 = female, 1 = male)",
  cp: "Chest pain type (1-4)",
  thalach: "Maximum heart rate achieved",
  exang: "Exercise-induced angina (0 = no, 1 = yes)",
  oldpeak: "ST depression induced by exercise",
  slope: "Slope of peak exercise ST segment (1-3)",
  ca: "Number of major vessels (0-3)",
  thal: "Thalassemia (3 = normal, 6 = fixed defect, 7 = reversible defect)",
} as const;
