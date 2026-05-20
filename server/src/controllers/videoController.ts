import type { Request, Response } from "express";
import { z } from "zod";
import type { AppContext } from "../types/app.js";

export function createVideoController(context: AppContext) {
  return {
    getVideosByModule: async (request: Request, response: Response) => {
      const moduleId = z.string().parse(request.params.moduleId);
      const videos = await context.repository.getVideosByModule(moduleId);
      response.json({ videos });
    }
  };
}
