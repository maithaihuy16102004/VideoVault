import React from 'react';
import { VideoDto } from '@/shared/types/download';
import { Button } from '@/components/ui/button';

interface Props {
    video: VideoDto;
    onDownload: () => void;
}

export const VideoCard: React.FC<Props> = ({ video, onDownload }) => (
    <div className="border rounded p-2 flex flex-col h-full">
        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-40 object-cover rounded" />
        <h3 className="mt-2 font-medium truncate" title={video.title}>{video.title}</h3>
        <p className="text-sm text-gray-500">{video.duration ? `${Math.floor(video.duration / 60)}:{('0' + (video.duration % 60)).slice(-2)}` : ''}</p>
        <Button className="mt-auto" onClick={onDownload}>Download</Button>
    </div>
);
