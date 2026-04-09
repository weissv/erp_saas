import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { checkRole } from "../../../middleware/checkRole";
import {
  getOneCSummary,
  listOneCCatalog,
  listOneCDocuments,
  listOneCHRDocuments,
  listOneCPayrollDocuments,
  listOneCRegisters,
  listOneCUniversalCatalogs,
  oneCAllowedRoles,
} from "../services/onec-data.service";

const router = Router();

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<any>,
  logLabel: string,
  userMessage: string,
): RequestHandler {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      return res.json(await handler(req, res));
    } catch (error) {
      if (error instanceof Error && error.message === "UNKNOWN_CATALOG_TYPE") {
        return res.status(400).json({ error: "Unknown catalog type" });
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${logLabel}:`, message);
      return res.status(500).json({ error: userMessage });
    }
  };
}

router.get(
  "/summary",
  checkRole(oneCAllowedRoles),
  asyncRoute(() => getOneCSummary(), "1C data summary error", "Ошибка получения сводки данных 1С"),
);

router.get(
  "/catalogs/:type",
  checkRole(oneCAllowedRoles),
  asyncRoute(
    (req) => listOneCCatalog(req.params.type, req.query as Record<string, string | string[] | undefined>),
    "1C catalog error",
    "Ошибка получения справочника",
  ),
);

router.get(
  "/documents",
  checkRole(oneCAllowedRoles),
  asyncRoute(
    (req) => listOneCDocuments(req.query as Record<string, string | string[] | undefined>),
    "1C documents error",
    "Ошибка получения документов",
  ),
);

router.get(
  "/hr-documents",
  checkRole(oneCAllowedRoles),
  asyncRoute(
    (req) => listOneCHRDocuments(req.query as Record<string, string | string[] | undefined>),
    "1C HR documents error",
    "Ошибка получения кадровых документов",
  ),
);

router.get(
  "/payroll-documents",
  checkRole(oneCAllowedRoles),
  asyncRoute(
    (req) => listOneCPayrollDocuments(req.query as Record<string, string | string[] | undefined>),
    "1C payroll documents error",
    "Ошибка получения зарплатных документов",
  ),
);

router.get(
  "/universal-catalogs",
  checkRole(oneCAllowedRoles),
  asyncRoute(
    (req) => listOneCUniversalCatalogs(req.query as Record<string, string | string[] | undefined>),
    "1C universal catalogs error",
    "Ошибка получения универсальных справочников",
  ),
);

router.get(
  "/registers",
  checkRole(oneCAllowedRoles),
  asyncRoute(
    (req) => listOneCRegisters(req.query as Record<string, string | string[] | undefined>),
    "1C registers error",
    "Ошибка получения регистров",
  ),
);

export default router;
