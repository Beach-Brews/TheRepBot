import {navigateTo} from "@devvit/web/client";

interface LeaderboardRowProps {
    username: string;
    score: number;
    pointName: string;
}

export const LeaderboardRow = (props: LeaderboardRowProps) => (
    <div className="w-full flex flex-col rounded-1 gap-2 my-2">
        <button onClick={() => navigateTo(`https://reddit.com/u/${props.username}`)}>{props.username}</button>
        <div>{props.score} {props.pointName}</div>
    </div>
);
