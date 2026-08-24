// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type ModerationRequestBody = {
  action?: unknown;
  reportId?: unknown;
};

type ModerationProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ModerationProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type ModerationReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  target_type: string;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  reviewed_at: string | null;
  resolution: string | null;
  moderator_notes: string | null;
};

type ModerationReportUpdate = {
  status?: string;
  reviewed_at?: string | null;
  resolution?: string | null;
  moderator_notes?: string | null;
};

type ModerationCommentRow = {
  id: string;
  collection_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type ModerationCollectionRow = {
  id: string;
  user_id: string;
  category: string;
  topic: string | null;
  title: string;
  status: string;
  items: unknown;
  published_at: string | null;
  created_at: string;
};

function mapProfile(
  profile: ModerationProfileRow
): ModerationProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
  };
}

function getCollectionIdFromReportedPostId(
  reportedPostId: string | null
): string | null {
  if (!reportedPostId) {
    return null;
  }

  const normalizedPostId =
    reportedPostId.trim();

  if (!normalizedPostId) {
    return null;
  }

  return normalizedPostId.startsWith("post-")
    ? normalizedPostId.slice(5)
    : normalizedPostId;
}

export default {
  fetch: withSupabase(
    {
      auth: "user",
    },
    async (request, ctx) => {
      if (request.method !== "POST") {
        return Response.json(
          {
            error: "Method not allowed.",
          },
          {
            status: 405,
          }
        );
      }

      const userId =
        ctx.userClaims?.id;

      if (!userId) {
        return Response.json(
          {
            error:
              "Authenticated user not found.",
          },
          {
            status: 401,
          }
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await ctx.supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();

      const adminProfile = profile as
        | {
            is_admin: boolean;
          }
        | null;

      if (profileError) {
        console.error(
          "Failed to verify moderation access:",
          profileError
        );

        return Response.json(
          {
            error:
              "Failed to verify moderation access.",
            details: profileError.message,
            code: profileError.code,
          },
          {
            status: 500,
          }
        );
      }

      if (!adminProfile?.is_admin) {
        return Response.json(
          {
            error: "Forbidden.",
          },
          {
            status: 403,
          }
        );
      }

      let body: ModerationRequestBody = {};

      try {
        body =
          await request.json();
      } catch {
        body = {};
      }

      const action =
        typeof body.action === "string"
          ? body.action.trim()
          : "";

      if (!action) {
        return Response.json({
          success: true,
          message:
            "Moderation access verified.",
        });
      }

      if (action === "remove-content") {
        const reportId =
          typeof body.reportId === "string"
            ? body.reportId.trim()
            : "";

        if (!reportId) {
          return Response.json(
            {
              error: "Report ID is required.",
            },
            {
              status: 400,
            }
          );
        }

        const {
          data: reportData,
          error: reportError,
        } = await ctx.supabaseAdmin
          .from("reports")
          .select(
            [
              "id",
              "status",
              "target_type",
              "reported_post_id",
              "reported_comment_id",
            ].join(",")
          )
          .eq("id", reportId)
          .eq("status", "pending")
          .maybeSingle();

        if (reportError) {
          console.error(
            "Failed to load report for content removal:",
            reportError
          );

          return Response.json(
            {
              error:
                "Failed to load report for content removal.",
              details: reportError.message,
              code: reportError.code,
            },
            {
              status: 500,
            }
          );
        }

        const report = reportData as
          | {
              id: string;
              status: string;
              target_type: string;
              reported_post_id: string | null;
              reported_comment_id: string | null;
            }
          | null;

        if (!report) {
          return Response.json(
            {
              error:
                "Pending report not found.",
            },
            {
              status: 404,
            }
          );
        }

        if (report.target_type === "user") {
          return Response.json(
            {
              error:
                "User reports do not contain removable content.",
            },
            {
              status: 400,
            }
          );
        }

        const removedAt =
          new Date().toISOString();

        let removalEvent:
          | {
              target_type: "post" | "comment";
              target_id: string;
              user_id: string;
              removed_at: string;
            }
          | null = null;

        if (report.target_type === "comment") {
          if (!report.reported_comment_id) {
            return Response.json(
              {
                error:
                  "Reported comment ID is missing.",
              },
              {
                status: 400,
              }
            );
          }

          const {
            data: removedComment,
            error: removeCommentError,
          } = await ctx.supabaseAdmin
            .from("comments")
            .update(
              {
                removed_at: removedAt,
              } as never
            )
            .eq(
              "id",
              report.reported_comment_id
            )
            .is("removed_at", null)
            .select("id,user_id")
            .maybeSingle();

          if (removeCommentError) {
            console.error(
              "Failed to remove reported comment:",
              removeCommentError
            );

            return Response.json(
              {
                error:
                  "Failed to remove reported comment.",
                details:
                  removeCommentError.message,
                code:
                  removeCommentError.code,
              },
              {
                status: 500,
              }
            );
          }

          if (!removedComment) {
            return Response.json(
              {
                error:
                  "Reported comment was not found or has already been removed.",
              },
              {
                status: 404,
              }
            );
          }

          removalEvent = {
            target_type: "comment",
            target_id:
              report.reported_comment_id,
            user_id:
              (
                removedComment as {
                  id: string;
                  user_id: string;
                }
              ).user_id,
            removed_at: removedAt,
          };
        } else if (
          report.target_type === "post"
        ) {
          const collectionId =
            getCollectionIdFromReportedPostId(
              report.reported_post_id
            );

          if (!collectionId) {
            return Response.json(
              {
                error:
                  "Reported collection ID is missing.",
              },
              {
                status: 400,
              }
            );
          }

          const {
            data: removedCollection,
            error: removeCollectionError,
          } = await ctx.supabaseAdmin
            .from("collections")
            .update(
              {
                removed_at: removedAt,
              } as never
            )
            .eq("id", collectionId)
            .is("removed_at", null)
            .select("id,user_id")
            .maybeSingle();

          if (removeCollectionError) {
            console.error(
              "Failed to remove reported collection:",
              removeCollectionError
            );

            return Response.json(
              {
                error:
                  "Failed to remove reported collection.",
                details:
                  removeCollectionError.message,
                code:
                  removeCollectionError.code,
              },
              {
                status: 500,
              }
            );
          }

          if (!removedCollection) {
            return Response.json(
              {
                error:
                  "Reported collection was not found or has already been removed.",
              },
              {
                status: 404,
              }
            );
          }

          removalEvent = {
            target_type: "post",
            target_id: collectionId,
            user_id:
              (
                removedCollection as {
                  id: string;
                  user_id: string;
                }
              ).user_id,
            removed_at: removedAt,
          };
        } else {
          return Response.json(
            {
              error:
                "Unsupported report target type.",
            },
            {
              status: 400,
            }
          );
        }

        const resolveUpdate: ModerationReportUpdate = {
          status: "resolved",
          reviewed_at: removedAt,
          resolution: "content_removed",
        };

        if (report.target_type === "comment") {
          const reportedCommentId =
            report.reported_comment_id;

          if (!reportedCommentId) {
            return Response.json(
              {
                error:
                  "Reported comment ID is missing.",
              },
              {
                status: 400,
              }
            );
          }

          const {
            error: resolveDuplicateReportsError,
          } = await ctx.supabaseAdmin
            .from("reports")
            .update(resolveUpdate as never)
            .eq("target_type", "comment")
            .eq(
              "reported_comment_id",
              reportedCommentId
            )
            .eq("status", "pending")
            .neq("id", reportId);

          if (resolveDuplicateReportsError) {
            console.error(
              "Content was removed but duplicate comment reports could not be resolved:",
              resolveDuplicateReportsError
            );

            return Response.json(
              {
                error:
                  "Content was removed but duplicate comment reports could not be resolved.",
                details:
                  resolveDuplicateReportsError.message,
                code:
                  resolveDuplicateReportsError.code,
              },
              {
                status: 500,
              }
            );
          }
        } else if (report.target_type === "post") {
          const reportedPostId =
            report.reported_post_id;

          if (!reportedPostId) {
            return Response.json(
              {
                error:
                  "Reported post ID is missing.",
              },
              {
                status: 400,
              }
            );
          }

          const {
            error: resolveDuplicateReportsError,
          } = await ctx.supabaseAdmin
            .from("reports")
            .update(resolveUpdate as never)
            .eq("target_type", "post")
            .eq(
              "reported_post_id",
              reportedPostId
            )
            .eq("status", "pending")
            .neq("id", reportId);

          if (resolveDuplicateReportsError) {
            console.error(
              "Content was removed but duplicate post reports could not be resolved:",
              resolveDuplicateReportsError
            );

            return Response.json(
              {
                error:
                  "Content was removed but duplicate post reports could not be resolved.",
                details:
                  resolveDuplicateReportsError.message,
                code:
                  resolveDuplicateReportsError.code,
              },
              {
                status: 500,
              }
            );
          }
        }

        const {
          data: resolvedReport,
          error: resolveError,
        } = await ctx.supabaseAdmin
          .from("reports")
          .update(
            resolveUpdate as never
          )
          .eq("id", reportId)
          .eq("status", "pending")
          .select(
            [
              "id",
              "status",
              "reviewed_at",
              "resolution",
            ].join(",")
          )
          .maybeSingle();

        if (resolveError) {
          console.error(
            "Content was removed but the report could not be resolved:",
            resolveError
          );

          return Response.json(
            {
              error:
                "Content was removed but the report could not be resolved.",
              details:
                resolveError.message,
              code: resolveError.code,
            },
            {
              status: 500,
            }
          );
        }

        if (!resolvedReport) {
          return Response.json(
            {
              error:
                "Content was removed but the pending report could not be resolved.",
            },
            {
              status: 409,
            }
          );
        }

        if (!removalEvent) {
          return Response.json(
            {
              error:
                "Content was removed but the removal event could not be created.",
            },
            {
              status: 500,
            }
          );
        }

        const {
          error: removalEventError,
        } = await ctx.supabaseAdmin
          .from(
            "moderation_content_removals"
          )
          .insert(removalEvent as never);

        if (removalEventError) {
          console.error(
            "Content was removed but the removal event could not be recorded:",
            removalEventError
          );

          return Response.json(
            {
              error:
                "Content was removed but the removal event could not be recorded.",
              details:
                removalEventError.message,
              code: removalEventError.code,
            },
            {
              status: 500,
            }
          );
        }

        return Response.json({
          success: true,
          report: resolvedReport,
        });
      }

      if (action === "dismiss-report") {
        const reportId =
          typeof body.reportId === "string"
            ? body.reportId.trim()
            : "";

        if (!reportId) {
          return Response.json(
            {
              error: "Report ID is required.",
            },
            {
              status: 400,
            }
          );
        }

        const dismissUpdate: ModerationReportUpdate = {
          status: "dismissed",
          reviewed_at:
            new Date().toISOString(),
          resolution: "no_action",
        };

        const {
          data: dismissedReport,
          error: dismissError,
        } = await ctx.supabaseAdmin
          .from("reports")
          .update(
            dismissUpdate as never
          )
          .eq("id", reportId)
          .eq("status", "pending")
          .select(
            [
              "id",
              "status",
              "reviewed_at",
              "resolution",
            ].join(",")
          )
          .maybeSingle();

        if (dismissError) {
          console.error(
            "Failed to dismiss report:",
            dismissError
          );

          return Response.json(
            {
              error:
                "Failed to dismiss report.",
              details:
                dismissError.message,
              code: dismissError.code,
            },
            {
              status: 500,
            }
          );
        }

        if (!dismissedReport) {
          return Response.json(
            {
              error:
                "Pending report not found.",
            },
            {
              status: 404,
            }
          );
        }

        return Response.json({
          success: true,
          report: dismissedReport,
        });
      }

      if (action === "list-pending") {
        const {
          data: reports,
          error: reportsError,
        } = await ctx.supabaseAdmin
          .from("reports")
          .select(
            [
              "id",
              "reporter_id",
              "reported_user_id",
              "reason",
              "details",
              "status",
              "created_at",
              "target_type",
              "reported_post_id",
              "reported_comment_id",
              "reviewed_at",
              "resolution",
              "moderator_notes",
            ].join(",")
          )
          .eq("status", "pending")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (reportsError) {
          console.error(
            "Failed to load pending reports:",
            reportsError
          );

          return Response.json(
            {
              error:
                "Failed to load pending reports.",
              details: reportsError.message,
              code: reportsError.code,
            },
            {
              status: 500,
            }
          );
        }

        const pendingReports =
          (reports ??
            []) as ModerationReportRow[];

        const profileIds = Array.from(
          new Set(
            pendingReports.flatMap(
              (report) => [
                report.reporter_id,
                report.reported_user_id,
              ]
            )
          )
        );

        let profilesById = new Map<
          string,
          ModerationProfile
        >();

        if (profileIds.length > 0) {
          const {
            data: profileRows,
            error: profilesError,
          } = await ctx.supabaseAdmin
            .from("profiles")
            .select(
              [
                "id",
                "username",
                "display_name",
                "avatar_url",
              ].join(",")
            )
            .in("id", profileIds);

          if (profilesError) {
            console.error(
              "Failed to load moderation profiles:",
              profilesError
            );

            return Response.json(
              {
                error:
                  "Failed to load moderation profiles.",
                details:
                  profilesError.message,
                code: profilesError.code,
              },
              {
                status: 500,
              }
            );
          }

          const typedProfileRows =
            (profileRows ??
              []) as ModerationProfileRow[];

          profilesById = new Map(
            typedProfileRows.map(
              (profileRow) => [
                profileRow.id,
                mapProfile(profileRow),
              ]
            )
          );
        }

        const commentIds = Array.from(
          new Set(
            pendingReports
              .filter(
                (report) =>
                  report.target_type ===
                    "comment" &&
                  Boolean(
                    report.reported_comment_id
                  )
              )
              .map(
                (report) =>
                  report.reported_comment_id
              )
              .filter(
                (
                  commentId
                ): commentId is string =>
                  Boolean(commentId)
              )
          )
        );

        let commentsById = new Map<
          string,
          ModerationCommentRow
        >();

        if (commentIds.length > 0) {
          const {
            data: commentRows,
            error: commentsError,
          } = await ctx.supabaseAdmin
            .from("comments")
            .select(
              [
                "id",
                "collection_id",
                "user_id",
                "content",
                "created_at",
              ].join(",")
            )
            .in("id", commentIds);

          if (commentsError) {
            console.error(
              "Failed to load reported comments:",
              commentsError
            );

            return Response.json(
              {
                error:
                  "Failed to load reported comments.",
                details:
                  commentsError.message,
                code: commentsError.code,
              },
              {
                status: 500,
              }
            );
          }

          const typedCommentRows =
            (commentRows ??
              []) as ModerationCommentRow[];

          commentsById = new Map(
            typedCommentRows.map(
              (commentRow) => [
                commentRow.id,
                commentRow,
              ]
            )
          );
        }

        const collectionIds = Array.from(
          new Set(
            pendingReports
              .filter(
                (report) =>
                  report.target_type === "post"
              )
              .map((report) =>
                getCollectionIdFromReportedPostId(
                  report.reported_post_id
                )
              )
              .filter(
                (
                  collectionId
                ): collectionId is string =>
                  Boolean(collectionId)
              )
          )
        );

        let collectionsById = new Map<
          string,
          ModerationCollectionRow
        >();

        if (collectionIds.length > 0) {
          const {
            data: collectionRows,
            error: collectionsError,
          } = await ctx.supabaseAdmin
            .from("collections")
            .select(
              [
                "id",
                "user_id",
                "category",
                "topic",
                "title",
                "status",
                "items",
                "published_at",
                "created_at",
              ].join(",")
            )
            .in("id", collectionIds);

          if (collectionsError) {
            console.error(
              "Failed to load reported collections:",
              collectionsError
            );

            return Response.json(
              {
                error:
                  "Failed to load reported collections.",
                details:
                  collectionsError.message,
                code: collectionsError.code,
              },
              {
                status: 500,
              }
            );
          }

          const typedCollectionRows =
            (collectionRows ??
              []) as ModerationCollectionRow[];

          collectionsById = new Map(
            typedCollectionRows.map(
              (collectionRow) => [
                collectionRow.id,
                collectionRow,
              ]
            )
          );
        }

        const enrichedReports =
          pendingReports.map(
            (report) => {
              const reportedComment =
                report.target_type ===
                  "comment" &&
                report.reported_comment_id
                  ? commentsById.get(
                      report.reported_comment_id
                    ) ?? null
                  : null;

              const reportedCollectionId =
                report.target_type === "post"
                  ? getCollectionIdFromReportedPostId(
                      report.reported_post_id
                    )
                  : null;

              const reportedCollection =
                reportedCollectionId
                  ? collectionsById.get(
                      reportedCollectionId
                    ) ?? null
                  : null;

              return {
                ...report,
                reporter:
                  profilesById.get(
                    report.reporter_id
                  ) ?? null,
                reportedUser:
                  profilesById.get(
                    report.reported_user_id
                  ) ?? null,
                reportedContent:
                  report.target_type ===
                    "comment" &&
                  reportedComment
                    ? {
                        type: "comment",
                        id:
                          reportedComment.id,
                        collectionId:
                          reportedComment.collection_id,
                        userId:
                          reportedComment.user_id,
                        content:
                          reportedComment.content,
                        createdAt:
                          reportedComment.created_at,
                      }
                    : report.target_type ===
                        "post" &&
                      reportedCollection
                    ? {
                        type: "post",
                        id:
                          report.reported_post_id,
                        collectionId:
                          reportedCollection.id,
                        userId:
                          reportedCollection.user_id,
                        category:
                          reportedCollection.category,
                        topic:
                          reportedCollection.topic,
                        title:
                          reportedCollection.title,
                        status:
                          reportedCollection.status,
                        items:
                          reportedCollection.items,
                        publishedAt:
                          reportedCollection.published_at,
                        createdAt:
                          reportedCollection.created_at,
                      }
                    : null,
              };
            }
          );

        return Response.json({
          success: true,
          reports: enrichedReports,
        });
      }

      return Response.json(
        {
          error:
            "Unsupported moderation action.",
        },
        {
          status: 400,
        }
      );
    }
  ),
};