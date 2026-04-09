#!/usr/bin/env npx tsx
// src/scripts/explorer.ts
// Глубокая разведка публикации 1С: OData, HTTP-сервисы и SOAP/WSDL из vrd.
// Запуск: npx tsx src/scripts/explorer.ts

import fs from "fs";
import path from "path";
import { AxiosInstance } from "axios";
import {
  createOneCApplicationClient,
  createOneCClient,
  getOneCApplicationBaseUrl,
  isNetworkError,
} from "../modules/onec/services/onec-client";

interface EntityInfo {
  name: string;
  url: string;
  kind: string;
  type: "Catalog" | "Document" | "InformationRegister" | "AccumulationRegister" | "Other";
}

interface MetadataComplexType {
  name: string;
  properties: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
}

interface MetadataEnumType {
  name: string;
  underlyingType: string | null;
  members: string[];
}

interface MetadataSummary {
  entityContainers: string[];
  complexTypes: MetadataComplexType[];
  enumTypes: MetadataEnumType[];
}

interface HttpProbeResult {
  name: string;
  path: string;
  kind: "odata-root" | "odata-metadata" | "odata-entity" | "http-service" | "wsdl";
  statusCode: number;
  ok: boolean;
  contentType: string | null;
  summary: string;
  bodyText: string;
  bodySnippet: string;
}

const V8_WS_POINTS = [
  { name: "AccHRMDataTransfer", alias: "AccHRMDataTransfer.1cws" },
  { name: "EnterpriseDataExchange_1_0_1_1", alias: "EnterpriseDataExchange_1_0_1_1.1cws" },
  { name: "EnterpriseDataUpload_1_0_1_1", alias: "EnterpriseDataUpload_1_0_1_1.1cws" },
  { name: "EquipmentService", alias: "EquipmentService.1cws" },
  { name: "Exchange", alias: "exchange.1cws" },
  { name: "Exchange_2_0_1_6", alias: "exchange_2_0_1_6.1cws" },
  { name: "Exchange_3_0_1_1", alias: "exchange_3_0_1_1.1cws" },
  { name: "InterfaceVersion", alias: "InterfaceVersion.1cws" },
  { name: "ManagedApplication_1_0_0_1", alias: "ManagedApplication_1_0_0_1.1cws" },
  { name: "MessageExchange", alias: "messageexchange.1cws" },
  { name: "MessageExchange_2_0_1_6", alias: "messageexchange_2_0_1_6.1cws" },
  { name: "MobileAccounting", alias: "MobileAccounting.1cws" },
  { name: "MobileEntrepreneur", alias: "MobileAcc.1cws" },
  { name: "MobileEntrepreneur_1_0_2_1", alias: "MobileEntrepreneur.1cws" },
  { name: "RemoteAdministrationOfExchange", alias: "RemoteAdministrationOfExchange.1cws" },
  { name: "RemoteAdministrationOfExchange_2_0_1_6", alias: "RemoteAdministrationOfExchange_2_0_1_6.1cws" },
  { name: "RemoteAdministrationOfExchange_2_1_6_1", alias: "RemoteAdministrationOfExchange_2_1_6_1.1cws" },
  { name: "RemoteAdministrationOfExchange_2_4_5_1", alias: "RemoteAdministrationOfExchange_2_4_5_1.1cws" },
  { name: "RemoteControl", alias: "RemoteControl.1cws" },
];

const HTTP_SERVICES = [
  { name: "АналитикаУчета", rootUrl: "analytics" },
  { name: "ПередачаДанных", rootUrl: "dt" },
  { name: "УниверсальнаяИнтеграцияВнутренняя", rootUrl: "ui_int" },
];

const COMMON_ENTITY_PROBES = [
  "Catalog_Номенклатура",
  "Catalog_Контрагенты",
  "Catalog_Организации",
  "Catalog_БанковскиеСчета",
  "Catalog_Склады",
  "Document_ПриходныйКассовыйОрдер",
  "Document_РасходныйКассовыйОрдер",
  "Document_СписаниеСРасчетногоСчета",
  "Document_ПоступлениеНаРасчетныйСчет",
  "Document_ПоступлениеТоваровУслуг",
  "Document_РеализацияТоваровУслуг",
  "InformationRegister_ЦеныНоменклатуры",
  "InformationRegister_КурсыВалют",
  "AccumulationRegister_ТоварыНаСкладах",
  "AccumulationRegister_ВзаиморасчетыСКонтрагентами",
];

function classifyEntity(name: string): EntityInfo["type"] {
  if (name.startsWith("Catalog_")) return "Catalog";
  if (name.startsWith("Document_")) return "Document";
  if (name.startsWith("InformationRegister_")) return "InformationRegister";
  if (name.startsWith("AccumulationRegister_")) return "AccumulationRegister";
  return "Other";
}

function bodyToText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data === null || data === undefined) return "";
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function summarizeBody(text: string): string {
  if (!text.trim()) return "Пустой ответ";
  if (text.includes("Ошибка при разборе дескриптора виртуальных ресурсов")) {
    return "1С не может разобрать default.vrd: ошибка XDTO по узлу standardOdata";
  }
  if (text.includes("не найдена")) {
    return "Сущность или endpoint не найдены";
  }
  if (text.startsWith("<?xml")) {
    if (text.includes("<definitions") || text.includes("<wsdl:definitions")) {
      return "WSDL документ доступен";
    }
    if (text.includes("<edmx:Edmx")) {
      return "OData metadata доступна";
    }
    return "XML ответ получен";
  }
  if (text.startsWith("{") || text.startsWith("[")) {
    return "JSON ответ получен";
  }
  return text.replace(/\s+/g, " ").slice(0, 160);
}

async function probeRequest(
  client: AxiosInstance,
  pathValue: string,
  kind: HttpProbeResult["kind"],
  name: string,
  params?: Record<string, string>,
  accept?: string
): Promise<HttpProbeResult> {
  const response = await client.get(pathValue, {
    params,
    timeout: 60000,
    responseType: "text",
    validateStatus: () => true,
    headers: accept ? { Accept: accept } : undefined,
  });

  const text = bodyToText(response.data);
  const contentTypeHeader = response.headers["content-type"];
  const contentType = Array.isArray(contentTypeHeader)
    ? contentTypeHeader.join(", ")
    : contentTypeHeader || null;

  return {
    name,
    path: pathValue,
    kind,
    statusCode: response.status,
    ok: response.status >= 200 && response.status < 300,
    contentType,
    summary: summarizeBody(text),
    bodyText: text,
    bodySnippet: text.slice(0, 600),
  };
}

function parseEntitiesFromServiceDocument(rawText: string): EntityInfo[] {
  try {
    const data = JSON.parse(rawText);

    if (Array.isArray(data?.value)) {
      return data.value.map((item: any) => ({
        name: item.name,
        url: item.url,
        kind: item.kind || "EntitySet",
        type: classifyEntity(item.name),
      }));
    }

    if (Array.isArray(data?.d?.EntitySets)) {
      return data.d.EntitySets.map((name: string) => ({
        name,
        url: name,
        kind: "EntitySet",
        type: classifyEntity(name),
      }));
    }
  } catch {
    return [];
  }

  return [];
}

function parseEntitiesFromMetadata(xml: string): EntityInfo[] {
  const entityRegex = /<EntitySet\s+Name="([^"]+)"[^>]*EntityType="([^"]+)"/g;
  const entities: EntityInfo[] = [];

  for (const match of xml.matchAll(entityRegex)) {
    const name = match[1];
    entities.push({
      name,
      url: name,
      kind: "EntitySet",
      type: classifyEntity(name),
    });
  }

  return entities;
}

function parseMetadataSummary(xml: string): MetadataSummary {
  const entityContainers = Array.from(
    xml.matchAll(/<EntityContainer\s+Name="([^"]+)"/g),
    (match) => match[1]
  );

  const complexTypes: MetadataComplexType[] = [];
  const complexTypeRegex = /<ComplexType\s+Name="([^"]+)"[^>]*>([\s\S]*?)<\/ComplexType>/g;
  for (const match of xml.matchAll(complexTypeRegex)) {
    const name = match[1];
    const body = match[2];
    const properties = Array.from(
      body.matchAll(/<Property\s+Name="([^"]+)"\s+Type="([^"]+)"\s+Nullable="([^"]+)"\/>/g),
      (propertyMatch) => ({
        name: propertyMatch[1],
        type: propertyMatch[2],
        nullable: propertyMatch[3] !== "false",
      })
    );

    complexTypes.push({ name, properties });
  }

  const enumTypes: MetadataEnumType[] = [];
  const enumTypeRegex = /<EnumType\s+Name="([^"]+)"(?:\s+UnderlyingType="([^"]+)")?[^>]*>([\s\S]*?)<\/EnumType>/g;
  for (const match of xml.matchAll(enumTypeRegex)) {
    const name = match[1];
    const underlyingType = match[2] || null;
    const body = match[3];
    const members = Array.from(body.matchAll(/<Member\s+Name="([^"]+)"\/>/g), (memberMatch) => memberMatch[1]);

    enumTypes.push({
      name,
      underlyingType,
      members,
    });
  }

  return {
    entityContainers,
    complexTypes,
    enumTypes,
  };
}

async function main() {
  try {
    const odataClient = createOneCClient();
    const appClient = createOneCApplicationClient();

    console.log("📡 Глубокая разведка публикации 1С...");
    console.log(`   App URL:   ${getOneCApplicationBaseUrl()}`);
    console.log(`   OData URL: ${odataClient.defaults.baseURL}`);

    const odataRootProbe = await probeRequest(
      odataClient,
      "",
      "odata-root",
      "OData service document",
      { $format: "json" },
      "application/json"
    );

    const metadataProbe = await probeRequest(
      odataClient,
      "$metadata",
      "odata-metadata",
      "OData metadata",
      undefined,
      "application/xml"
    );

    const entitiesFromRoot = parseEntitiesFromServiceDocument(odataRootProbe.bodyText);
    const metadataXml = metadataProbe.ok ? metadataProbe.bodyText : "";
    const entitiesFromMetadata = metadataProbe.ok ? parseEntitiesFromMetadata(metadataXml) : [];
    const metadataSummary = metadataProbe.ok
      ? parseMetadataSummary(metadataXml)
      : { entityContainers: [], complexTypes: [], enumTypes: [] };
    const entities = entitiesFromRoot.length > 0 ? entitiesFromRoot : entitiesFromMetadata;

    const entityProbes = await Promise.all(
      COMMON_ENTITY_PROBES.map((entity) =>
        probeRequest(
          odataClient,
          encodeURIComponent(entity),
          "odata-entity",
          entity,
          { $format: "json", $top: "1" },
          "application/json"
        )
      )
    );

    const httpServiceProbes = await Promise.all(
      HTTP_SERVICES.map((service) =>
        probeRequest(appClient, service.rootUrl, "http-service", service.name)
      )
    );

    const wsdlProbes = await Promise.all(
      V8_WS_POINTS.map((point) =>
        probeRequest(appClient, `${point.alias}?wsdl`, "wsdl", point.name)
      )
    );

    const catalogs = entities.filter((entity) => entity.type === "Catalog");
    const documents = entities.filter((entity) => entity.type === "Document");
    const registers = entities.filter(
      (entity) =>
        entity.type === "InformationRegister" || entity.type === "AccumulationRegister"
    );
    const other = entities.filter((entity) => entity.type === "Other");

    const report = {
      discoveredAt: new Date().toISOString(),
      publication: {
        applicationBaseUrl: getOneCApplicationBaseUrl(),
        odataBaseUrl: odataClient.defaults.baseURL,
      },
      odata: {
        rootProbe: odataRootProbe,
        metadataProbe,
        metadataSummary,
        entitiesFound: entities.length,
        entitiesSource: entitiesFromRoot.length > 0 ? "service-document" : entitiesFromMetadata.length > 0 ? "metadata" : "none",
        summary: {
          catalogs: catalogs.length,
          documents: documents.length,
          registers: registers.length,
          other: other.length,
        },
        entityProbes,
        catalogs: catalogs.map((entity) => entity.name),
        documents: documents.map((entity) => entity.name),
        registers: registers.map((entity) => entity.name),
        other: other.map((entity) => entity.name),
        allEntities: entities,
      },
      httpServices: httpServiceProbes,
      wsdlServices: wsdlProbes,
      conclusions: [
        odataRootProbe.summary,
        metadataProbe.summary,
        httpServiceProbes.some((probe) => probe.summary.includes("default.vrd")) || wsdlProbes.some((probe) => probe.summary.includes("default.vrd"))
          ? "Публикация 1С частично сломана: сервер возвращает XDTO-ошибку разбора default.vrd по узлу standardOdata"
          : "Публикация не показывает признаков общей ошибки default.vrd",
      ],
    };

    const outPath = path.resolve(__dirname, "../../1c_structure.json");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

    const odataRootPath = path.resolve(__dirname, "../../1c_odata_root_response.txt");
    fs.writeFileSync(odataRootPath, odataRootProbe.bodyText, "utf-8");

    const metaPath = path.resolve(__dirname, "../../1c_metadata.xml");
    fs.writeFileSync(metaPath, metadataProbe.bodyText, "utf-8");

    console.log(`\n💾 Глубокий отчёт сохранён: ${outPath}`);
    console.log(`   Raw OData root saved: ${odataRootPath}`);
    console.log(`   Raw metadata saved:   ${metaPath}`);
    console.log(`   OData root: ${odataRootProbe.statusCode} — ${odataRootProbe.summary}`);
    console.log(`   OData metadata: ${metadataProbe.statusCode} — ${metadataProbe.summary}`);
    console.log(`   Найдено EntitySet: ${entities.length}`);
    console.log(`   HTTP services checked: ${httpServiceProbes.length}`);
    console.log(`   WSDL services checked: ${wsdlProbes.length}`);

    const brokenServices = [...httpServiceProbes, ...wsdlProbes].filter(
      (probe) => probe.summary.includes("default.vrd")
    );
    if (brokenServices.length > 0) {
      console.log("\n❌ Сервер публикации 1С возвращает общую XDTO-ошибку default.vrd для этих сервисов:");
      for (const probe of brokenServices.slice(0, 8)) {
        console.log(`   - ${probe.kind} ${probe.name}: HTTP ${probe.statusCode}`);
      }
    }

    const existingEntityCandidates = entityProbes.filter((probe) => probe.ok);
    if (existingEntityCandidates.length === 0) {
      console.log("\n❌ Среди типовых OData-сущностей ничего не найдено.");
    } else {
      console.log("\n✅ Найдены типовые OData-сущности:");
      for (const probe of existingEntityCandidates) {
        console.log(`   - ${probe.name}: HTTP ${probe.statusCode}`);
      }
    }
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      console.error("\n❌ 1С сервер недоступен по сети.");
      console.error("   Проверьте Tailscale, публикацию 1С и доступность хоста.");
    } else if ((error as any)?.response?.status === 401) {
      console.error("\n❌ Ошибка аутентификации (401). Проверьте логин и пароль.");
    } else {
      console.error("\n❌ Непредвиденная ошибка:", (error as Error).message);
    }
    process.exit(1);
  }
}

main();
