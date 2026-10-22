import { useState } from "react";
import type { User } from "../lib/contracts";

export function UserAvatar({
  user,
  className = "avatar",
}: {
  user: User;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = user.avatar_url;
  return (
    <span className={className}>
      {source && source !== failedSource ? (
        <img
          src={source}
          alt={`Foto de perfil de ${user.display_name}`}
          width={64}
          height={64}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(source)}
        />
      ) : (
        user.display_name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
