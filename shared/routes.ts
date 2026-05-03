import { z } from "zod";
import { insertDeedSchema, insertCategorySchema, insertTargetSchema, insertTargetFolderSchema, insertPushSubscriptionSchema, insertUserOnboardingSchema, purchaseStreakFreezerSchema, targetRecommendationsRequestSchema, targetRecommendationsResponseSchema, updateProfileSchema, voiceParseRequestSchema, voiceParseResponseSchema, deeds, categories, targets, targetFolders, targetHistory, pushSubscriptions, userOnboarding } from "./schema";

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
        // Created deed plus optional metadata about a streak-freezer refund
        // triggered by this insert (e.g. backdated entries that land on a
        // previously auto-frozen day). Existing clients can ignore the
        // refund fields safely.
        201: z.custom<typeof deeds.$inferSelect & {
          freezerRefunded?: boolean;
          refundedDate?: string | null;
        }>(),
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
    voiceParse: {
      method: "POST" as const,
      path: "/api/deeds/voice-parse",
      input: voiceParseRequestSchema,
      responses: {
        200: voiceParseResponseSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        429: errorSchemas.validation,
        500: errorSchemas.internal,
        503: errorSchemas.internal,
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
        403: errorSchemas.forbidden,
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
        403: errorSchemas.forbidden,
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
    recommendations: {
      method: "POST" as const,
      path: "/api/targets/recommendations",
      input: targetRecommendationsRequestSchema,
      responses: {
        200: targetRecommendationsResponseSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        429: errorSchemas.validation,
        500: errorSchemas.internal,
        503: errorSchemas.internal,
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
          frozenDays: z.array(z.boolean()),
          // Calendar dates (YYYY-MM-DD) that were auto-frozen during THIS
          // streak read — i.e. the user has not yet been notified about
          // these specific freezer consumptions. The client uses this to
          // show a one-time toast/banner so silent consumption is visible.
          newlyFrozenDates: z.array(z.string()),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    month: {
      method: "GET" as const,
      path: "/api/streak/month",
      responses: {
        200: z.object({
          days: z.array(z.object({
            date: z.string(),
            hadDeed: z.boolean(),
            wasFrozen: z.boolean(),
          })),
          daysPracticed: z.number(),
          freezersUsed: z.number(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    day: {
      method: "GET" as const,
      path: "/api/streak/day",
      responses: {
        200: z.object({
          date: z.string(),
          hadDeed: z.boolean(),
          wasFrozen: z.boolean(),
          deeds: z.array(z.custom<typeof deeds.$inferSelect>()),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  streakFreezer: {
    get: {
      method: "GET" as const,
      path: "/api/streak-freezer",
      responses: {
        200: z.object({
          freezer: z.object({
            owned: z.number(),
            used: z.number(),
            available: z.number(),
          }),
          points: z.object({
            earned: z.number(),
            spent: z.number(),
            available: z.number(),
          }),
          frozenDates: z.array(z.string()),
          // Richer per-entry view of the same set, including refund state.
          // Refunded entries (refundedAt != null) are kept on the ledger so
          // the client can surface "this freezer was refunded" history.
          frozenEntries: z.array(z.object({
            date: z.string(),
            refundedAt: z.string().nullable(),
          })),
          packs: z.array(z.object({
            size: z.number(),
            cost: z.number(),
            discountPercent: z.number(),
          })),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    purchase: {
      method: "POST" as const,
      path: "/api/streak-freezer/purchase",
      input: purchaseStreakFreezerSchema,
      responses: {
        200: z.object({
          freezer: z.object({
            owned: z.number(),
            used: z.number(),
            available: z.number(),
          }),
          points: z.object({
            earned: z.number(),
            spent: z.number(),
            available: z.number(),
          }),
          purchased: z.object({
            packSize: z.number(),
            pointsCost: z.number(),
            freezersGranted: z.number(),
          }),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        402: z.object({
          message: z.string(),
          code: z.literal("INSUFFICIENT_POINTS"),
          available: z.number(),
          required: z.number(),
        }),
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
          username: z.string().nullable(),
          phoneNumber: z.string().nullable(),
          onboardingComplete: z.boolean(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    updateProfile: {
      method: "PATCH" as const,
      path: "/api/auth/user",
      input: updateProfileSchema,
      responses: {
        200: z.object({
          id: z.string(),
          email: z.string().nullable(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          profileImageUrl: z.string().nullable(),
          username: z.string().nullable(),
          phoneNumber: z.string().nullable(),
          onboardingComplete: z.boolean(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  onboarding: {
    get: {
      method: "GET" as const,
      path: "/api/onboarding",
      responses: {
        200: z.custom<typeof userOnboarding.$inferSelect | null>(),
        401: errorSchemas.unauthorized,
      },
    },
    complete: {
      method: "POST" as const,
      path: "/api/onboarding/complete",
      input: insertUserOnboardingSchema,
      responses: {
        200: z.custom<typeof userOnboarding.$inferSelect>(),
        400: errorSchemas.validation,
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
