import {
    Context,
    Form,
    FormOnSubmitEvent,
    JSONObject,
    MenuItemOnPressEvent,
} from "@devvit/public-api";
import { customPostFormKey } from "../main.js";
import { AppSetting } from "../settings.js";
import pluralize from "pluralize";
import { logger } from "../logger.js";
import { reddit } from '@devvit/web/server';

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

export const customPostForm: Form = {
    title: "Create Leaderboard Post",
    fields: [
        {
            label: "Post title",
            name: "postTitle",
            type: "string",
            defaultValue: "TheRepBot High Scores",
        },
        {
            label: "Number of users to include",
            name: "numberOfUsers",
            type: "number",
            defaultValue: 20,
        },
        {
            label: "Sticky post",
            name: "stickyPost",
            type: "boolean",
            defaultValue: true,
        },
        {
            label: "Remove previous leaderboard post",
            name: "removeExisting",
            type: "boolean",
            defaultValue: true,
        },
        {
            label: "Lock comment by bot?",
            helpText:
                "The bot will post a comment explaining the post and how to refresh it if the post is empty. This option decides whether or not users can reply to that comment.",
            name: "lockBotComment",
            type: "boolean",
            defaultValue: true,
        },
    ],
};

export interface CustomPostData {
    postId: string;
    numberOfUsers: number;
}

export async function createCustomPostFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const redisKey = "customPostData";

    let postTitle = event.values.postTitle as string | undefined;
    postTitle ??= "TheRepBot High Scores";

    const subredditName =
        context.subredditName ??
        (await context.reddit.getCurrentSubredditName());

    const post = await reddit.submitCustomPost({
        subredditName,
        title: postTitle,
    });

    const newData: CustomPostData = {
        postId: post.id,
        numberOfUsers: (event.values.numberOfUsers as number | undefined) ?? 20,
    };

    if (newData.numberOfUsers > 20) {
        context.ui.showToast({
            text: "Users to include must be 20 or less",
            appearance: "neutral",
        });
        return;
    }

    if (event.values.removeExisting) {
        const customPostData = await context.redis.get(redisKey);
        if (customPostData) {
            const data = JSON.parse(customPostData) as CustomPostData;
            const post = await context.reddit.getPostById(data.postId);
            await post.remove();
        }
        logger.info("🗑️ Removed existing leaderboard post");
    }

    await context.redis.set(redisKey, JSON.stringify(newData));

    if (event.values.stickyPost) {
        await post.sticky();
    }

    const settings = await context.settings.getAll();
    const pointName = pluralize(
        (settings[AppSetting.PointName] as string) ?? "point"
    );
    // --- NEW: Bot posts a message to the newly created leaderboard post ---
    const botMessage = formatMessage(
        `This post displays the top **${newData.numberOfUsers}** users with the most ${pointName} in this subreddit.\n\n` +
        `It is updated periodically, but you can also refresh it manually by clicking the refresh button at the top of the leaderboard.`,
        {}
    );
    const leaderboardPostComment = await context.reddit.submitComment({
        id: post.id,
        text: botMessage,
    });

    // Sticky the bot comment
    await leaderboardPostComment.distinguish(true);

    if (event.values.lockBotComment) {
        await leaderboardPostComment.lock();
    }

    context.ui.showToast({
        text: "Leaderboard post has been created successfully",
        appearance: "success",
    });
    context.ui.navigateTo(post);
}

export function createCustomPostMenuHandler(
    _: MenuItemOnPressEvent,
    context: Context
) {
    context.ui.showForm(customPostFormKey);
}
