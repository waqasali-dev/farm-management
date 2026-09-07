import React, { useState, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { useFlocksQuery, useHealthQuery } from '../../lib/queries.js';
import { Flock } from '../../types/index.js';
import { CreateFlockModal } from '../../features/flocks/CreateFlockModal.js';

export const AppLayout: React.FC = () => {
  const { data: flocks = [], refetch: refetchFlocks } = useFlocksQuery();
  const { data: health } = useHealthQuery();

  const [activeFlock, setActiveFlock] = useState<Flock | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // Synchronize active flock from URL, localStorage, or first active flock
  useEffect(() => {
    if (flocks.length === 0) return;

    const queryFlockId = searchParams.get('flock');
    const savedFlockId = localStorage.getItem('active_flock_id');

    let target = flocks.find((f) => f.id === queryFlockId);
    if (!target && savedFlockId) {
      target = flocks.find((f) => f.id === savedFlockId);
    }
    if (!target) {
      target = flocks.find((f) => f.status === 'active') || flocks[0];
    }

    if (target) {
      setActiveFlock(target);
      localStorage.setItem('active_flock_id', target.id);
    }
  }, [flocks, searchParams]);

  const handleSelectFlock = (flock: Flock) => {
    setActiveFlock(flock);
    localStorage.setItem('active_flock_id', flock.id);
  };

  return (
    <div className="h-screen w-screen bg-white flex flex-col font-sans text-black overflow-hidden">
      <Header
        flocks={flocks}
        activeFlock={activeFlock}
        onSelectFlock={handleSelectFlock}
        health={health}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar activeFlock={activeFlock} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50 min-h-0">
          <Outlet context={{ activeFlock, flocks, refreshFlocks: refetchFlocks, health }} />
        </main>
      </div>

      <CreateFlockModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newFlock) => {
          refetchFlocks();
          handleSelectFlock(newFlock);
        }}
      />
    </div>
  );
};
