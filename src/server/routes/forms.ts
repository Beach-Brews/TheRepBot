import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import {context, reddit, redis, settings} from "@devvit/web/server";
import pluralize from "pluralize";

type CreatePostFormValues = {
    postTitle?: string;
    numberOfUsers?: number;
    stickyPost?: boolean;
    removeExisting?: boolean;
    lockBotComment?: boolean;
};

export interface CustomPostData {
    postId: `t3_${string}`;
    numberOfUsers: number;
}

export const forms = new Hono();

function formatMessage(
    template: string,
    placeholders: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        result = result.replace(regex, value);
    }

    const footer =
        "\n\n---\n\n^(I am a bot - please contact the mods with any questions)";
    if (
        !result
            .trim()
            .endsWith(
                "^(I am a bot - please contact the mods with any questions)"
            )
    ) {
        result = result.trim() + footer;
    }

    return result;
}

forms.post('/create-post', async (c) => {
    const values = await c.req.json<CreatePostFormValues>();
    const redisKey = "customPostData";

    let postTitle = values.postTitle as string | undefined;
    postTitle ??= "TheRepBot High Scores";

    const subredditName =
        context.subredditName ??
        (await reddit.getCurrentSubreddit())?.name;

    const post = await reddit.submitCustomPost({
        subredditName,
        title: postTitle,
    });

    const newData: CustomPostData = {
        postId: post.id,
        numberOfUsers: (values.numberOfUsers as number | undefined) ?? 20,
    };

    if (newData.numberOfUsers > 20) {
        return c.json<UiResponse>(
            {
                showToast: {
                    text: "Users to include must be 20 or less",
                    appearance: 'neutral'
                }
            },
            400
        );
    }

    if (values.removeExisting) {
        const customPostData = await redis.get(redisKey);
        if (customPostData) {
            const data = JSON.parse(customPostData) as CustomPostData;
            const post = await reddit.getPostById(data.postId);
            await post.remove();
        }
        console.log("🗑️ Removed existing leaderboard post");
    }

    await redis.set(redisKey, JSON.stringify(newData));

    if (values.stickyPost) {
        await post.sticky();
    }

    const pointNameSetting = await settings.get<string>('pointName');
    const pointName = pluralize(pointNameSetting ?? "point");
    // --- NEW: Bot posts a message to the newly created leaderboard post ---
    const botMessage = formatMessage(
        `This post displays the top **${newData.numberOfUsers}** users with the most ${pointName} in this subreddit.\n\n` +
        `It is updated periodically, but you can also refresh it manually by clicking the refresh button at the top of the leaderboard.`,
        {}
    );
    const leaderboardPostComment = await reddit.submitComment({
        id: post.id,
        text: botMessage,
    });

    // Sticky the bot comment
    await leaderboardPostComment.distinguish(true);

    if (values.lockBotComment) {
        await leaderboardPostComment.lock();
    }

    return c.json<UiResponse>(
        {
            showToast: {
                text: "Leaderboard post has been created successfully",
                appearance: "success"
            },
            navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`
        },
        200);
});
