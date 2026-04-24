import { z } from "zod";
import { insertDeedSchema, insertCategorySchema, insertTargetSchema, insertTargetFolderSchema, insertPushSubscriptionSchema, deeds, categories, targets, targetFolders, targetHistory, pushSubscriptions } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

export const api = {
  deeds: {
    list: {
      method: "GET" as const,
      path: "/api/deeds",
      responses: {
        200: z.array(z.custom<typeof deeds.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/deeds",
      input: insertDeedSchema,
      responses: {
        201: z.custom<typeof deeds.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/deeds/:id",
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/deeds/:id",
      input: insertDeedSchema,
      responses: {
        200: z.custom<typeof deeds.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  categories: {
    list: {
      method: "GET" as const,
      path: "/api/categories",
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/categories",
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/categories/:id",
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/categories/:id",
      input: insertCategorySchema,
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    reorder: {
      method: "POST" as const,
      path: "/api/categories/reorder",
      input: z.object({ orderedIds: z.array(z.number()) }),
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
  targetFolders: {
    list: {
      method: "GET" as const,
      path: "/api/target-folders",
      responses: {
        200: z.array(z.custom<typeof targetFolders.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/target-folders",
      input: insertTargetFolderSchema,
      responses: {
        201: z.custom<typeof targetFolders.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/target-folders/:id",
      input: insertTargetFolderSchema,
      responses: {
        200: z.custom<typeof targetFolders.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/target-folders/:id",
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    moveTarget: {
      method: "PATCH" as const,
      path: "/api/targets/:id/folder",
      input: z.object({
        folderId: z.number().int().positive().nullable(),
      }),
      responses: {
        200: z.custom<typeof targets.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  targets: {
    list: {
      method: "GET" as const,
      path: "/api/targets",
      responses: {
        200: z.array(z.custom<typeof targets.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    listWithProgress: {
      method: "GET" as const,
      path: "/api/targets/progress",
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/targets",
      input: insertTargetSchema,
      responses: {
        201: z.custom<typeof targets.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/targets/:id",
      input: insertTargetSchema.partial(),
      responses: {
        200: z.custom<typeof targets.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/targets/:id",
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    history: {
      method: "GET" as const,
      path: "/api/targets/:id/history",
      responses: {
        200: z.object({
          history: z.array(z.custom<typeof targetHistory.$inferSelect>()),
          currentStreak: z.number(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    updateProgress: {
      method: "PATCH" as const,
      path: "/api/targets/:id/progress",
      input: z.object({ progress: z.number().min(0) }),
      responses: {
        200: z.custom<typeof targets.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    complete: {
      method: "POST" as const,
      path: "/api/targets/:id/complete",
      responses: {
        200: z.custom<typeof targets.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    deedsForDate: {
      method: "GET" as const,
      path: "/api/targets/:id/deeds-for-date",
      responses: {
        200: z.array(z.custom<typeof deeds.$inferSelect>()),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    detail: {
      method: "GET" as const,
      path: "/api/targets/:id/detail",
      responses: {
        200: z.object({
          target: z.any(),
          currentStreak: z.number(),
          longestStreak: z.number(),
          totalAccumulated: z.number(),
          totalQuantity: z.number(),
          totalPoints: z.number(),
          averagePercentage: z.number(),
          history: z.array(z.custom<typeof targetHistory.$inferSelect>()),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  streak: {
    get: {
      method: "GET" as const,
      path: "/api/streak",
      responses: {
        200: z.object({
          streakCount: z.number(),
          weekDays: z.array(z.boolean()),
          hasActivityToday: z.boolean(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  push: {
    status: {
      method: "GET" as const,
      path: "/api/push/status",
      responses: {
        200: z.object({
          configured: z.boolean(),
          subscribed: z.boolean(),
          settings: z.object({
            dailyReminder: z.boolean(),
            reminderTime: z.string(),
            targetAlerts: z.boolean(),
            sholatReminder: z.boolean(),
            hasLocation: z.boolean(),
          }).nullable(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    subscribe: {
      method: "POST" as const,
      path: "/api/push/subscribe",
      input: insertPushSubscriptionSchema,
      responses: {
        201: z.object({
          success: z.boolean(),
          subscription: z.custom<typeof pushSubscriptions.$inferSelect>(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    updateSettings: {
      method: "PATCH" as const,
      path: "/api/push/settings",
      input: z.object({
        dailyReminder: z.boolean().optional(),
        reminderTime: z.string().optional(),
        timezone: z.string().optional(),
        targetAlerts: z.boolean().optional(),
        sholatReminder: z.boolean().optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        notificationSound: z.enum(["chime", "double", "ding", "none"]).optional(),
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          subscription: z.custom<typeof pushSubscriptions.$inferSelect>(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    unsubscribe: {
      method: "DELETE" as const,
      path: "/api/push/unsubscribe",
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      },
    },
    test: {
      method: "POST" as const,
      path: "/api/push/test",
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  auth: {
    user: {
      method: "GET" as const,
      path: "/api/auth/user",
      responses: {
        200: z.object({
          id: z.string(),
          email: z.string().nullable(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          profileImageUrl: z.string().nullable(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export type CreateCategoryRequest = z.infer<typeof api.categories.create.input>;
export type CategoryResponse = typeof categories.$inferSelect;

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
