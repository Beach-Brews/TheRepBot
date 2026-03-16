import './index.css';

import {StrictMode, useEffect, useState} from 'react';
import { createRoot } from 'react-dom/client';
import {LeaderboardRow} from "./LeaderboardRow";
import pluralize from "pluralize";
import { navigateTo } from '@devvit/web/client';
import { LeaderboardData } from '../shared/api';

const capitalize = (word: string): string => {
    return word.charAt(0).toUpperCase() + word.slice(1);
};

export const Leaderboard = () => {
    const [data, setData] = useState<LeaderboardData | undefined>(undefined);

    useEffect(() => {
        if (data) return;
        const refreshLeaderboard = async () => {
            const res = await fetch('/api/getLeaderboard');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const resJson: LeaderboardData = await res.json();
            setData(resJson);
        };
        void refreshLeaderboard();
    }, [data]);

    if (!data) {
        return (
            <div className="w-full h-full flex">
                Loading...
            </div>
        );
    }

    const { helpUrl, pointName, entries } = data;

    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full flex justify-center items-center gap-4 p-2 border-2">
                <img alt="podium" width={48} height={48} src="podium.png" />
                <div className="text-lg font-bold">Top scoring users</div>
                {helpUrl ? (
                    <button onClick={() => { navigateTo(helpUrl); }}>
                        Help (could use https://heroicons.com/solid)
                    </button>
                ) : (
                    <img alt="podium" width={48} height={48} src="podium.png" />
                )}
            </div>
            <button onClick={() => setData(undefined)}>Refresh (https://heroicons.com/solid)</button>
            <div className="flex flex-col p-2 gap-2 w-full">
                <div className="w-full flex gap-2">
                    {entries.map((entry, i) => (
                        <LeaderboardRow
                            key={i}
                            pointName={capitalize(pluralize(pointName || "point", entry.score))}
                            username={entry.username}
                            score={entry.score}
                        />
                    ))}
                </div>
                {/*
                <vstack alignment="bottom start" grow>
                    <hstack alignment="middle center" gap="small">
                        <button
                            disabled={page === 1}
                            onPress={() =>
                                state.leaderboardPage[1](page - 1)
                            }
                        >
                            &lt;
                        </button>
                        <spacer />
                        <text
                            onPress={() => {
                                state.leaderboardPage; // Set page to 1
                            }}
                        >
                            {page}
                        </text>
                        <spacer />
                        <button
                            disabled={page === state.maxPage}
                            onPress={() =>
                                state.leaderboardPage[1](page + 1)
                            }
                        >
                            &gt;
                        </button>
                    </hstack>
                </vstack>
                */}
            </div>
        </div>
    );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Leaderboard />
  </StrictMode>
);
