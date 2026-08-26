import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axios';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials) => api.post('/auth/login/', credentials),
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No token');
      const res = await api.get('/auth/me/');
      return res.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
};

// ---------------------------------------------------------------------------
// Beneficiaries
// ---------------------------------------------------------------------------
export const useBeneficiaries = (params = {}) => {
  return useQuery({
    queryKey: ['beneficiaries', params],
    queryFn: () => api.get('/beneficiaries/', { params }).then((r) => r.data),
  });
};

export const useBeneficiary = (id) => {
  return useQuery({
    queryKey: ['beneficiary', id],
    queryFn: () => api.get(`/beneficiaries/${id}/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useCreateBeneficiary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/beneficiaries/', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
};

export const useBeneficiaryCurrentHoldings = (id) => {
  return useQuery({
    queryKey: ['beneficiary-holdings', id],
    queryFn: () => api.get(`/beneficiaries/${id}/current-holdings/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useBeneficiaryFullHistory = (id) => {
  return useQuery({
    queryKey: ['beneficiary-history', id],
    queryFn: () => api.get(`/beneficiaries/${id}/full-history/`).then((r) => r.data),
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------
export const useAnimals = (params = {}) => {
  return useQuery({
    queryKey: ['animals', params],
    queryFn: () => api.get('/animals/', { params }).then((r) => r.data),
  });
};

export const useAnimal = (id) => {
  return useQuery({
    queryKey: ['animal', id],
    queryFn: () => api.get(`/animals/${id}/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useCreateAnimal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/animals/', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['animals'] }),
  });
};

export const useAnimalHistory = (id) => {
  return useQuery({
    queryKey: ['animal-history', id],
    queryFn: () => api.get(`/animals/${id}/history/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useAnimalLocationTimeline = (id) => {
  return useQuery({
    queryKey: ['animal-timeline', id],
    queryFn: () => api.get(`/animals/${id}/location-timeline/`).then((r) => r.data),
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Species & Breeds
// ---------------------------------------------------------------------------
export const useSpecies = () => {
  return useQuery({
    queryKey: ['species'],
    queryFn: () => api.get('/species/').then((r) => r.data),
  });
};

export const useBreeds = (speciesId) => {
  return useQuery({
    queryKey: ['breeds', speciesId],
    queryFn: () => api.get('/breeds/', { params: { species: speciesId } }).then((r) => r.data),
    enabled: !!speciesId,
  });
};

// ---------------------------------------------------------------------------
// Dispersal
// ---------------------------------------------------------------------------
export const useDisperseAnimal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/dispersal/disperse/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] });
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      qc.invalidateQueries({ queryKey: ['ownership-records'] });
    },
  });
};

export const useRedisperseAnimal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/dispersal/redisperse/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] });
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      qc.invalidateQueries({ queryKey: ['ownership-records'] });
    },
  });
};

export const useReturnToCVO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/dispersal/return-to-cvo/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] });
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      qc.invalidateQueries({ queryKey: ['ownership-records'] });
    },
  });
};

export const useOwnershipRecords = (params = {}) => {
  return useQuery({
    queryKey: ['ownership-records', params],
    queryFn: () => api.get('/dispersal/records/', { params }).then((r) => r.data),
  });
};

export const useTransferReasons = () => {
  return useQuery({
    queryKey: ['transfer-reasons'],
    queryFn: () => api.get('/dispersal/transfer-reasons/').then((r) => r.data),
  });
};

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------
export const useActiveAnimalsMap = () => {
  return useQuery({
    queryKey: ['active-animals-map'],
    queryFn: () => api.get('/dispersal/map/active-animals/').then((r) => r.data),
    staleTime: 30_000,
  });
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const useDispersalSummary = (params = {}) => {
  return useQuery({
    queryKey: ['dispersal-summary', params],
    queryFn: () => api.get('/reports/dispersal-summary/', { params }).then((r) => r.data),
  });
};

export const useRedispersalFrequency = () => {
  return useQuery({
    queryKey: ['redispersal-frequency'],
    queryFn: () => api.get('/reports/redispersal-frequency/').then((r) => r.data),
  });
};

// ---------------------------------------------------------------------------
// Barangays
// ---------------------------------------------------------------------------
export const useBarangays = () => {
  return useQuery({
    queryKey: ['barangays'],
    queryFn: () => api.get('/barangays/').then((r) => r.data),
  });
};

// ---------------------------------------------------------------------------
// Geo-Tagging
// ---------------------------------------------------------------------------
export const useGeoTags = (params = {}) => {
  return useQuery({
    queryKey: ['geotags', params],
    queryFn: () => api.get('/geotagging/tags/', { params }).then((r) => r.data),
  });
};

export const useGeoTag = (id) => {
  return useQuery({
    queryKey: ['geotag', id],
    queryFn: () => api.get(`/geotagging/tags/${id}/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useGeoTagByCode = (tagCode) => {
  return useQuery({
    queryKey: ['geotag-code', tagCode],
    queryFn: () => api.get(`/geotagging/tags/${tagCode}/lookup/`).then((r) => r.data),
    enabled: !!tagCode,
  });
};

export const useTagAnimal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/geotagging/tags/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geotags'] });
      qc.invalidateQueries({ queryKey: ['animals'] });
    },
  });
};

export const useCustodyLineage = (id) => {
  return useQuery({
    queryKey: ['custody-lineage', id],
    queryFn: () => api.get(`/geotagging/tags/${id}/lineage/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useTagCheckins = (id) => {
  return useQuery({
    queryKey: ['tag-checkins', id],
    queryFn: () => api.get(`/geotagging/tags/${id}/checkins/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useCustodianships = (params = {}) => {
  return useQuery({
    queryKey: ['custodianships', params],
    queryFn: () => api.get('/geotagging/custodianships/', { params }).then((r) => r.data),
  });
};

export const useCreateCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/geotagging/checkins/create/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tag-checkins'] });
    },
  });
};

export const useHandoffCustodianship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/geotagging/handoff/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custodianships'] });
      qc.invalidateQueries({ queryKey: ['custody-lineage'] });
      qc.invalidateQueries({ queryKey: ['active-geo-map'] });
    },
  });
};

export const useRetireTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.post(`/geotagging/tags/${id}/retire/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geotags'] });
      qc.invalidateQueries({ queryKey: ['active-geo-map'] });
    },
  });
};

export const useActiveGeoMap = (params = {}) => {
  return useQuery({
    queryKey: ['active-geo-map', params],
    queryFn: () => api.get('/geotagging/map/active/', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
};

export const useCustodyTrail = (id) => {
  return useQuery({
    queryKey: ['custody-trail', id],
    queryFn: () => api.get(`/geotagging/map/${id}/trail/`).then((r) => r.data),
    enabled: !!id,
  });
};

export const useCaretakers = (params = {}) => {
  return useQuery({
    queryKey: ['caretakers', params],
    queryFn: () => api.get('/geotagging/caretakers/', { params }).then((r) => r.data),
  });
};

export const useCreateCaretaker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/geotagging/caretakers/', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caretakers'] }),
  });
};

export const useHandoffReasons = () => {
  return useQuery({
    queryKey: ['handoff-reasons'],
    queryFn: () => api.get('/geotagging/handoff-reasons/').then((r) => r.data),
  });
};
