import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

export const menu = new Hono();

menu.post('/create-post', async (c) => {
    try {
        return c.json<UiResponse>(
            {
                showForm: {
                    name: 'post-create-form',
                    form: {
                        title: 'Create Leaderboard Post',
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
                            }
                        ]
                    }
                }
            },
            200
        );
    } catch (error) {
        console.error(`Error creating post: ${error}`);
        return c.json<UiResponse>(
            {
                showToast: 'Failed to create post',
            },
            400
        );
    }
});
