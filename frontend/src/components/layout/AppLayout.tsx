import React, { useState, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { api } from '../../lib/api-client.js';
import { Flock, HealthStatus } from '../../types/index.js';
import { CreateFlockModal } from '../../features/flocks/CreateFlockModal.js';

export const AppLayout: React.FC = () => {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlock, setActiveFlock] = useState<Flock | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load flocks and health
  const refreshFlocks = async () => {
    try {
      const data = await api.getFlocks();
      setFlocks(data);

      // Select flock from query param or localStorage or first active flock
      const queryFlockId = searchParams.get('flock');
      const savedFlockId = localStorage.getItem('active_flock_id');

      let target = data.find((f) => f.id === queryFlockId);
      if (!target && savedFlockId) {
        target = data.find((f) => f.id === savedFlockId);
      }
      if (!target && data.length > 0) {
        target = data.find((f) => f.status === 'active') || data[0];
      }

      if (target) {
        setActiveFlock(target);
        localStorage.setItem('active_flock_id', target.id);
      }
    } catch (err) {
      console.error('Failed to load flocks:', err);
    }
  };

  const refreshHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      // Backend is temporarily offline or loading
    }
  };

  useEffect(() => {
    refreshFlocks();
    refreshHealth();
    const interval = setInterval(refreshHealth, 15000); // Poll health every 15s
    return () => clearInterval(interval);
  }, []);

  const handleSelectFlock = (flock: Flock) => {
    setActiveFlock(flock);
    localStorage.setItem('active_flock_id', flock.id);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-black">
      <Header
        flocks={flocks}
        activeFlock={activeFlock}
        onSelectFlock={handleSelectFlock}
        health={health}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeFlock={activeFlock} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50">
          <Outlet context={{ activeFlock, flocks, refreshFlocks, health }} />
        </main>
      </div>

      <CreateFlockModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newFlock) => {
          refreshFlocks();
          handleSelectFlock(newFlock);
        }}
      />
    </div>
  );
};
