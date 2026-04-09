import { z } from "zod";

export const integrationEntitySchema = z.enum(["children", "employees", "inventory", "finance"]);
export type IntegrationEntity = z.infer<typeof integrationEntitySchema>;

export const exportExcelSchema = z.object({
  params: z.object({
    entity: integrationEntitySchema,
  }),
});

export const importExcelSchema = z.object({
  params: z.object({
    entity: integrationEntitySchema,
  }),
  body: z.object({
    fileBase64: z.string().min(1, "Передайте содержимое файла в base64"),
  }),
});

export const importGoogleSheetSchema = z.object({
  body: z.object({
    entity: integrationEntitySchema,
    sheetUrl: z.string().url("Укажите публичную ссылку на Google Sheets"),
  }),
});
