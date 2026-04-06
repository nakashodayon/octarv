"use client";

import { cn } from "@/lib/utils";

interface TweetMockProps {
  username: string;
  handle: string;
  avatar?: string;
  content: string;
  date?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  verified?: boolean;
  className?: string;
}

const Twitter = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    viewBox="0 0 24 24"
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g>
      <path fill="none" d="M0 0h24v24H0z"></path>
      <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path>
    </g>
  </svg>
);

const Verified = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
  <svg
    aria-label="Verified Account"
    viewBox="0 0 24 24"
    className={className}
    {...props}
  >
    <g fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
    <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
  </svg>
);

const RetweetIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
    <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
  </svg>
);

const ReplyIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
    <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
  </svg>
);

export function TweetMock({
  username,
  handle,
  avatar,
  content,
  date = "Mar 15",
  likes = 128,
  retweets = 24,
  replies = 12,
  verified = false,
  className,
}: TweetMockProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 w-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt={username} className="size-full object-cover" />
            ) : (
              <div className="size-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-foreground">{username}</span>
              {verified && (
                <Verified className="size-4 text-blue-500" />
              )}
            </div>
            <span className="text-muted-foreground text-xs">@{handle}</span>
          </div>
        </div>
        <Twitter className="size-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <p className="text-sm text-foreground leading-relaxed">{content}</p>

      {/* Date */}
      <span className="text-xs text-muted-foreground">{date}</span>

      {/* Actions */}
      <div className="flex items-center gap-6 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 cursor-pointer transition-colors">
          <ReplyIcon />
          <span className="text-xs">{replies}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-green-500 cursor-pointer transition-colors">
          <RetweetIcon />
          <span className="text-xs">{retweets}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
          <HeartIcon />
          <span className="text-xs">{likes}</span>
        </div>
      </div>
    </div>
  );
}
