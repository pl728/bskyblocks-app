'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useDebounce } from 'react-use';
import { Search, User } from 'lucide-react';

interface Profile {
  avatar?: string;
  handle: string;
  displayName?: string;
  description?: string;
}

interface BlocklistItem {
  handle: string;
  avatar?: string;
  blocked_date: string;
  status: boolean;
}

const API = {
  async getDidFromHandle(handle: string) {
    try {
      const response = await fetch(
        `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}.bsky.social`,
        {
          headers: {
            accept: '*/*',
            origin: 'https://clearsky.app',
            referer: 'https://clearsky.app/',
          },
        }
      );
      const data = await response.json();
      return data.did || null;
    } catch (error) {
      console.error('Error fetching DID:', error);
      return null;
    }
  },

  async getProfileByDid(did: string) {
    try {
      const response = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
        {
          headers: {
            accept: '*/*',
            origin: 'https://clearsky.app',
            referer: 'https://clearsky.app/',
          },
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  async getBlocklist(handle: string) {
    try {
      const response = await fetch(
        `https://api.clearsky.services/api/v1/anon/single-blocklist/${handle}`,
        {
          headers: {
            accept: '*/*',
            origin: 'https://clearsky.app',
            referer: 'https://clearsky.app/',
          },
        }
      );
      const data = await response.json();
      return data.data.blocklist || [];
    } catch (error) {
      console.error('Error fetching blocklist:', error);
      return [];
    }
  },
};

const SearchResult = ({ profile, onSelect }: { profile: Profile; onSelect: () => void }) => (
  <div
    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
    onClick={onSelect}
  >
    <Avatar>
      <AvatarImage src={profile.avatar} />
      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
    </Avatar>
    <div className="flex flex-col">
      <span className="font-medium text-gray-900">{profile.displayName || 'Unknown'}</span>
      <span className="text-sm text-gray-500">@{profile.handle}</span>
      {profile.description && (
        <span className="text-sm text-gray-600 line-clamp-2 mt-1">{profile.description}</span>
      )}
    </div>
  </div>
);

const BlocklistItem = ({ block }: { block: BlocklistItem }) => (
  <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <Avatar>
      <AvatarImage src={block.avatar} />
      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
    </Avatar>
    <div className="flex flex-col flex-1">
      <span className="font-medium text-gray-900">@{block.handle}</span>
      <span className="text-sm text-gray-500">
        Blocked on: {new Date(block.blocked_date).toLocaleDateString()}
      </span>
      <div className="flex items-center gap-1 mt-1">
        <div
          className={`w-2 h-2 rounded-full ${
            block.status ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm text-gray-600">
          {block.status ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  </div>
);

const BlocklistView = ({ selectedProfile, blocklist }: { selectedProfile: Profile; blocklist: BlocklistItem[] }) => (
  <Card className="mt-6">
    <CardHeader className="flex flex-row items-center gap-4">
      <Avatar>
        <AvatarImage src={selectedProfile.avatar} />
        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <CardTitle className="text-xl">Accounts blocking @{selectedProfile.handle}</CardTitle>
        {selectedProfile.displayName && (
          <span className="text-sm text-gray-500">{selectedProfile.displayName}</span>
        )}
      </div>
    </CardHeader>
    <CardContent>
      {blocklist.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No users have blocked this handle.</p>
      ) : (
        <div className="space-y-4">
          {blocklist.map((block, index) => (
            <BlocklistItem key={`${block.handle}-${index}`} block={block} />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function BlocklistApp() {
  const [query, setQuery] = useState('');
  const [searchProfile, setSearchProfile] = useState<Profile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [blocklist, setBlocklist] = useState<BlocklistItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchForProfile = async (query: string) => {
    if (query.length < 3) {
      setSearchProfile(null);
      return;
    }

    setIsSearching(true);
    const did = await API.getDidFromHandle(query);
    if (did) {
      const profileData = await API.getProfileByDid(did);
      setSearchProfile(profileData);
    } else {
      setSearchProfile(null);
    }
    setIsSearching(false);
  };

  const handleSelect = async (profile: Profile) => {
    setSelectedProfile(profile);
    const blocklistData = await API.getBlocklist(profile.handle);
    setBlocklist(blocklistData);
    setQuery('');
    setSearchProfile(null);
  };

  useDebounce(
    () => {
      searchForProfile(query);
    },
    300,
    [query]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchProfile(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search handle..."
              className="pl-10 w-full"
            />
          </div>
          {searchProfile && (
            <Card className="absolute w-full mt-1 z-10">
              <ScrollArea className="max-h-80">
                <SearchResult profile={searchProfile} onSelect={() => handleSelect(searchProfile)} />
              </ScrollArea>
            </Card>
          )}
        </div>
        {selectedProfile && blocklist.length > 0 && (
          <BlocklistView selectedProfile={selectedProfile} blocklist={blocklist} />
        )}
      </div>
    </div>
  );
}