/**
 * Trash Management Card Component
 * 
 * Displays trash statistics as a simple metric card.
 */

import React from 'react';
import { Trash2 } from 'lucide-react';

interface TrashManagementCardProps {
  documentsInTrash: number;
}

export default function TrashManagementCard({ 
  documentsInTrash
}: TrashManagementCardProps) {

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">Documents in Trash</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{documentsInTrash}</p>
          <p className="text-xs text-gray-500">
            {documentsInTrash === 0 ? 'Trash is empty' : 'Recoverable files'}
          </p>
        </div>
        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border bg-red-50 text-red-600 border-red-200">
          <Trash2 className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}