import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSpecies, useBreeds, useCreateAnimal } from '../api/hooks';
import { useState } from 'react';
import { Beef, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnimalRegistrationPage() {
  const navigate = useNavigate();
  const createMutation = useCreateAnimal();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      sex: 'FEMALE',
      is_batch: false,
      batch_quantity: 1,
    },
  });

  const selectedSpeciesId = watch('species');
  const isBatch = watch('is_batch');

  const { data: speciesList } = useSpecies();
  const { data: breedsList } = useBreeds(selectedSpeciesId);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        is_batch: data.is_batch || false,
        batch_quantity: data.is_batch ? parseInt(data.batch_quantity) : 1,
      };
      // Remove empty optional fields
      if (!payload.birth_date) delete payload.birth_date;
      if (!payload.estimated_age_months) delete payload.estimated_age_months;
      if (!payload.weight_kg) delete payload.weight_kg;
      if (!payload.breed) delete payload.breed;

      const result = await createMutation.mutateAsync(payload);
      navigate(`/animals/${result.data.id}`);
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/animals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Animals
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Beef className="h-6 w-6 text-green-600" />
        Register New Animal
      </h1>
      <p className="text-sm text-gray-500">
        Register an animal into the CVO pool as AVAILABLE for future dispersal.
      </p>

      {createMutation.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          {createMutation.error.response?.data?.detail || 'Registration failed. Please check your inputs.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Species */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species *</label>
            <select
              {...register('species', { required: 'Species is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select species...</option>
              {speciesList?.results?.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name} ({sp.category})</option>
              ))}
            </select>
            {errors.species && <p className="text-red-500 text-xs mt-1">{errors.species.message}</p>}
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
            <select
              {...register('breed')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select breed (optional)...</option>
              {breedsList?.results?.map((br) => (
                <option key={br.id} value={br.id}>{br.name}</option>
              ))}
            </select>
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sex *</label>
            <select
              {...register('sex', { required: 'Sex is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input
              {...register('source')}
              placeholder="e.g., DA-RFO donation, LGU-purchased"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Birth date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
            <input
              {...register('birth_date')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Estimated age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Age (months)</label>
            <input
              {...register('estimated_age_months')}
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color / Markings</label>
            <input
              {...register('color_markings')}
              placeholder="e.g., Brown with white patches"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input
              {...register('weight_kg')}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Batch settings */}
        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('is_batch')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Batch (lot) registration</span>
            <span className="text-xs text-gray-400">(for poultry dispersed as a group)</span>
          </label>

          {isBatch && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Quantity</label>
              <input
                {...register('batch_quantity')}
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? 'Registering...' : 'Register Animal'}
        </button>
      </form>
    </div>
  );
}
