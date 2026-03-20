import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RobotStore {
  mineIds: string[];
  addMine: (id: string) => void;
  removeMine: (id: string) => void;
  clearMine: () => void;
}

export const useRobotStore = create<RobotStore>()(
  persist(
    (set) => ({
      mineIds: [],
      addMine: (id) => set((state) => ({ mineIds: Array.from(new Set([...state.mineIds, id])) })),
      removeMine: (id) => set((state) => ({ mineIds: state.mineIds.filter((m) => m !== id) })),
      clearMine: () => set({ mineIds: [] }),
    }),
    {
      name: 'minisumo-robot-storage',
    }
  )
);
