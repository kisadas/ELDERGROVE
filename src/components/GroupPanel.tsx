import React from 'react';
import { ChevronDown, ChevronUp, Crown, LogOut, Navigation, UserMinus, UserPlus, Users } from 'lucide-react';
import {
  CLASS_CONFIG,
  GROUP_REWARD_RADIUS_METERS,
  MAX_GROUP_MEMBERS,
  WORLD_SCALE,
} from '../shared/gameTypes';
import type { GroupInfo, PlayerState } from '../shared/gameTypes';

interface GroupPanelProps {
  localPlayer: PlayerState;
  allPlayers: PlayerState[];
  groups: GroupInfo[];
  minimized?: boolean;
  onToggleMinimize?: () => void;
  onCreateGroup: () => void;
  onInvitePlayer: (targetId: string) => void;
  onKickPlayer: (targetId: string) => void;
  onLeaveGroup: () => void;
  onRallyFriend: (targetId: string) => void;
}

export const GroupPanel: React.FC<GroupPanelProps> = ({
  localPlayer,
  allPlayers,
  groups,
  minimized = false,
  onToggleMinimize,
  onCreateGroup,
  onInvitePlayer,
  onKickPlayer,
  onLeaveGroup,
  onRallyFriend,
}) => {
  const myGroup = localPlayer.groupId
    ? groups.find((g) => g.id === localPlayer.groupId) || null
    : null;
  const isLeader = myGroup ? myGroup.leaderId === localPlayer.id : false;

  const groupMembers = myGroup
    ? myGroup.memberIds
        .map((id) => allPlayers.find((p) => p.id === id))
        .filter((p): p is PlayerState => Boolean(p))
    : [];

  const otherRealmPlayers = allPlayers.filter((p) => p.id !== localPlayer.id);
  const invitablePlayers = otherRealmPlayers.filter(
    (p) => !p.groupId && (!myGroup || myGroup.memberIds.length < MAX_GROUP_MEMBERS)
  );

  return (
    <div className="pointer-events-auto bg-[#131822]/92 border border-white/10 rounded-xl p-3 shadow-xl hidden sm:block">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          {myGroup ? (
            <span>
              Party ({groupMembers.length}/{MAX_GROUP_MEMBERS})
            </span>
          ) : (
            <span>Party &amp; Realm ({allPlayers.length})</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!myGroup ? (
            <button
              type="button"
              onClick={onCreateGroup}
              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Create
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeaveGroup}
              title="Leave Group"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Leave
            </button>
          )}

          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              title={minimized ? 'Expand Party Panel' : 'Minimize Party Panel'}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
            >
              {minimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <div className="mt-2">
          {myGroup ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto mmo-scroll pr-1">
              {groupMembers.map((member) => {
                const isMe = member.id === localPlayer.id;
                const distMeters = Math.round(
                  Math.hypot(member.x - localPlayer.x, member.y - localPlayer.y) * WORLD_SCALE
                );
                const inRange = distMeters <= GROUP_REWARD_RADIUS_METERS;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1A2130] border border-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs gap-1">
                        <span className="font-medium text-slate-100 truncate flex items-center gap-1">
                          {myGroup.leaderId === member.id && (
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                          )}
                          {member.name}
                        </span>
                        <span className="font-mono-num text-amber-300 shrink-0">
                          Lv.{member.level}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{CLASS_CONFIG[member.heroClass].name}</span>
                        {!isMe && (
                          <span
                            className={`font-mono-num ${
                              inRange ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {distMeters}m {inRange ? '· 100% Share' : '· >50m'}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            isMe ? 'bg-emerald-500' : 'bg-sky-400'
                          }`}
                          style={{
                            width: `${Math.max(0, Math.min(100, (member.hp / member.maxHp) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {!isMe && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRallyFriend(member.id)}
                          title={`Teleport to ${member.name}`}
                          className="p-1.5 rounded bg-white/5 hover:bg-sky-500/25 text-sky-300 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                        </button>
                        {isLeader && (
                          <button
                            type="button"
                            onClick={() => onKickPlayer(member.id)}
                            title={`Kick ${member.name}`}
                            className="p-1.5 rounded bg-white/5 hover:bg-red-500/25 text-red-300 transition-colors cursor-pointer"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {isLeader && invitablePlayers.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="text-[10px] font-medium text-slate-400">
                    Invite Players in Realm
                  </div>
                  {invitablePlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded bg-[#0E131C]"
                    >
                      <span className="text-slate-200 truncate">
                        {p.name} · Lv.{p.level}
                      </span>
                      <button
                        type="button"
                        onClick={() => onInvitePlayer(p.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 text-[11px] font-medium cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : otherRealmPlayers.length === 0 ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              Create a group (up to 10 members). Allies within 50m receive 100% shared XP &amp; drops.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto mmo-scroll pr-1">
              {otherRealmPlayers.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1A2130] border border-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-100 truncate">{friend.name}</span>
                      <span className="font-mono-num text-sky-300 shrink-0 ml-1">Lv.{friend.level}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-400"
                        style={{
                          width: `${Math.max(0, Math.min(100, (friend.hp / friend.maxHp) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRallyFriend(friend.id)}
                    title={`Teleport to ${friend.name}`}
                    className="p-1.5 rounded-md bg-white/5 hover:bg-sky-500/25 text-sky-300 transition-colors shrink-0 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
