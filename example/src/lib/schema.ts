import { z } from "zod";

export const heartFeatureSchema = z.object({
  age: z.coerce
    .number()
    .min(1, "Tuổi phải lớn hơn 0")
    .max(120, "Tuổi có vẻ không hợp lý"),
  sex: z.coerce
    .number()
    .int("Giới tính phải là số nguyên")
    .min(0)
    .max(1, "Giới hạn 0 cho nữ, 1 cho nam"),
  cp: z.coerce
    .number()
    .int("Loại đau ngực phải là số nguyên")
    .min(1)
    .max(4),
  thalach: z.coerce
    .number()
    .min(60, "Giá trị có vẻ quá thấp")
    .max(250, "Giá trị có vẻ quá cao"),
  exang: z.coerce
    .number()
    .int("Giá trị phải là số nguyên")
    .min(0)
    .max(1),
  oldpeak: z.coerce
    .number()
    .min(0)
    .max(7, "Giá trị có vẻ quá cao"),
  slope: z.coerce
    .number()
    .int("Độ dốc phải là số nguyên")
    .min(1)
    .max(3),
  ca: z.coerce
    .number()
    .int("Giá trị phải là số nguyên")
    .min(0)
    .max(3),
  thal: z.coerce
    .number()
    .int("Giá trị phải là số nguyên")
    .min(3)
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
  age: "Tuổi (năm)",
  sex: "Giới tính (0 = nữ, 1 = nam)",
  cp: "Phân loại đau ngực (1-4)",
  thalach: "Nhịp tim tối đa đạt được",
  exang: "Đau thắt ngực do gắng sức (0 = không, 1 = có)",
  oldpeak: "Độ chênh ST do gắng sức",
  slope: "Độ dốc đoạn ST khi gắng sức (1-3)",
  ca: "Số lượng mạch vành lớn (0-3)",
  thal: "Chỉ số thalassemia (3 = bình thường, 6 = tổn thương cố định, 7 = tổn thương hồi phục)",
} as const;
