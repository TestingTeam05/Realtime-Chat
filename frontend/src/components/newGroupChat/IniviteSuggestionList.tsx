import type { Friend } from "@/types/user";
import UserAvatar from "../chat/UserAvatar";

interface InviteSuggestionListProps {
  filteredFriends: Friend[];
  onSelect: (friend: Friend) => void;
}

const IniviteSuggestionList = ({
  filteredFriends,
  onSelect,
}: InviteSuggestionListProps) => {
  if (filteredFriends.length === 0) {
    return;
  }

  return (
    <div className="border rounded-lg mt-2 max-h-45 overflow-y-auto divide-y">
      {filteredFriends.map((friend) => (
        <button
          key={friend._id}
          type="button"
          className="flex items-center gap-3 p-2 w-full text-left cursor-pointer hover:bg-muted transition"
          onClick={() => onSelect(friend)}
        >
          <UserAvatar
            type="chat"
            name={friend.displayName}
            avatarUrl={friend.avatarUrl}
          />

          <span className="font-medium">{friend.displayName}</span>
        </button>
      ))}
    </div>
  );
};

export default IniviteSuggestionList;
