import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { LoadingSpinner, EmptyState } from '../components/ui/LoadingSpinner';
import { Plus, Edit2, Trash2, Beef, X } from 'lucide-react';

function SpeciesModal({ species, onClose, onSave }) {
  const [name, setName] = useState(species?.name || '');
  const [category, setCategory] = useState(species?.category || 'LIVESTOCK');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (species?.id) {
        await api.patch(`/species/${species.id}/`, { name, category });
        toast.success('Species updated successfully');
      } else {
        await api.post('/species/', { name, category });
        toast.success('Species created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.name?.[0] || 'Failed to save species');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{species?.id ? 'Edit' : 'Add'} Species</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="e.g., Goat, Cattle, Chicken"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="LIVESTOCK">Livestock (individually tracked)</option>
              <option value="POULTRY">Poultry (batch-tracked)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BreedModal({ breed, speciesList, onClose, onSave }) {
  const [name, setName] = useState(breed?.name || '');
  const [speciesId, setSpeciesId] = useState(breed?.species || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (breed?.id) {
        await api.patch(`/breeds/${breed.id}/`, { name, species: speciesId });
        toast.success('Breed updated successfully');
      } else {
        await api.post('/breeds/', { name, species: speciesId });
        toast.success('Breed created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.name?.[0] || 'Failed to save breed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{breed?.id ? 'Edit' : 'Add'} Breed</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species *</label>
            <select
              value={speciesId}
              onChange={(e) => setSpeciesId(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="">Select species...</option>
              {speciesList?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Breed Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="e.g., Boer, Native, Rhode Island Red"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SpeciesManagementPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { canWrite } = useAuth();
  const [editingSpecies, setEditingSpecies] = useState(null);
  const [editingBreed, setEditingBreed] = useState(null);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: speciesData, isLoading: speciesLoading } = useQuery({
    queryKey: ['species'],
    queryFn: () => api.get('/species/').then((r) => r.data),
  });

  const { data: breedData, isLoading: breedLoading } = useQuery({
    queryKey: ['breeds'],
    queryFn: () => api.get('/breeds/').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      return api.delete(`/${type}/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['species'] });
      qc.invalidateQueries({ queryKey: ['breeds'] });
      toast.success('Deleted successfully');
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Cannot delete — it may be referenced by existing records');
      setDeleteTarget(null);
    },
  });

  const speciesList = speciesData?.results || [];
  const breedList = breedData?.results || [];

  if (speciesLoading || breedLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Species & Breeds</h1>
          <p className="text-sm text-gray-500">Manage animal species and breed classifications</p>
        </div>
      </div>

      {/* Species */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Species ({speciesList.length})</h2>
          {canWrite && (
            <button
              onClick={() => { setEditingSpecies(null); setShowSpeciesModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
            >
              <Plus className="h-4 w-4" /> Add Species
            </button>
          )}
        </div>
        {speciesList.length === 0 ? (
          <EmptyState icon={Beef} title="No species yet" description="Add your first species to get started" />
        ) : (
          <div className="divide-y divide-gray-100">
            {speciesList.map((sp) => (
              <div key={sp.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div>
                  <span className="font-medium text-gray-900">{sp.name}</span>
                  <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{sp.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  {canWrite && (
                    <>
                      <button onClick={() => { setEditingSpecies(sp); setShowSpeciesModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'species', id: sp.id, name: sp.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breeds */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Breeds ({breedList.length})</h2>
          {canWrite && (
            <button
              onClick={() => { setEditingBreed(null); setShowBreedModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
            >
              <Plus className="h-4 w-4" /> Add Breed
            </button>
          )}
        </div>
        {breedList.length === 0 ? (
          <EmptyState icon={Beef} title="No breeds yet" description="Add breeds under your species" />
        ) : (
          <div className="divide-y divide-gray-100">
            {breedList.map((br) => (
              <div key={br.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div>
                  <span className="font-medium text-gray-900">{br.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{br.species_name || 'Unknown species'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {canWrite && (
                    <>
                      <button onClick={() => { setEditingBreed(br); setShowBreedModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'breeds', id: br.id, name: br.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSpeciesModal && (
        <SpeciesModal
          species={editingSpecies}
          onClose={() => setShowSpeciesModal(false)}
          onSave={() => { qc.invalidateQueries({ queryKey: ['species'] }); setShowSpeciesModal(false); }}
        />
      )}
      {showBreedModal && (
        <BreedModal
          breed={editingBreed}
          speciesList={speciesList}
          onClose={() => setShowBreedModal(false)}
          onSave={() => { qc.invalidateQueries({ queryKey: ['breeds'] }); setShowBreedModal(false); }}
        />
      )}

      <ConfirmationModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'species' ? 'Species' : 'Breed'}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
