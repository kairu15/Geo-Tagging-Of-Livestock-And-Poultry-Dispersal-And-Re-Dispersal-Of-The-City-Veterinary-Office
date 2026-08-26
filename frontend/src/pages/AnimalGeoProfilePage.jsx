import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Tag, Clock, AlertTriangle, QrCode,
  ChevronLeft, Activity, Shield
} from 'lucide-react';
import { useGeoTag, useGeoTagByCode, useCustodyLineage, useCustodyTrail } from '../api/hooks';
import CustodyLineageTimeline from '../components/geo/CustodyLineageTimeline';
import CustodyTrailMap from '../components/geo/CustodyTrailMap';
import TagQRCode from '../components/geo/TagQRCode';

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const tagTypeLabels = {
  EAR_TAG: 'Ear Tag',
  LEG_BAND: 'Leg Band',
  QR_ONLY: 'QR Only',
  GPS_COLLAR: 'GPS Collar',
};

export default function AnimalGeoProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // If we have an ID, fetch by ID; otherwise search by code
  const { data: geoTag, isLoading: loadingTag } = useGeoTag(id);
  const { data: searchedTag, isLoading: loadingSearch } = useGeoTagByCode(
    !id && searchCode ? searchCode : null
  );

  const tagData = geoTag || searchedTag;
  const geoTagId = tagData?.id;

  const { data: lineageData, isLoading: loadingLineage } = useCustodyLineage(geoTagId);
  const { data: trailData, isLoading: loadingTrail } = useCustodyTrail(geoTagId);

  const lineage = lineageData?.lineage || [];
  const currentCustodianship = tagData?.current_custodianship;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/geo-tracking/lookup/${searchCode.trim()}`);
    }
  };

  // Search page when no tag data
  if (!id && !tagData) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <QrCode className="h-6 w-6 text-green-600" />
          Tag Lookup
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Scan or enter a tag code to view an animal's geo-profile
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Enter tag code (e.g., GT-2026-000001)"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {loadingSearch && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Looking up tag...</p>
          </div>
        )}

        {searchedTag === null && searchCode && !loadingSearch && (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
            <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Tag not found</p>
            <p className="text-sm text-gray-400 mt-1">
              No tag with code "{searchCode}" exists in the system.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (loadingTag) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading geo-profile...</p>
        </div>
      </div>
    );
  }

  if (!tagData) return null;

  const animal = {
    tag_id: tagData.animal_tag,
    species: tagData.species_name,
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header — Pet Passport Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-5 w-5 opacity-80" />
                <span className="text-sm opacity-80 uppercase tracking-wide">Geo-Tag Profile</span>
              </div>
              <h1 className="text-2xl font-bold">{tagData.tag_code}</h1>
              <p className="text-green-100 mt-1">
                {animal.tag_id} — {animal.species}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tagData.is_active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                }`}
              >
                {tagData.is_active ? 'Active' : 'Retired'}
              </span>
              <p className="text-sm text-green-100 mt-2">
                {tagTypeLabels[tagData.tag_type] || tagData.tag_type}
              </p>
            </div>
          </div>
        </div>

        {/* Current Custodianship Summary */}
        {currentCustodianship && (
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Current Custodian
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Caretaker</p>
                <p className="font-medium text-gray-900">{currentCustodianship.caretaker_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Since</p>
                <p className="font-medium text-gray-900">{currentCustodianship.start_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Condition at Intake</p>
                <p className="font-medium text-gray-900">
                  {currentCustodianship.intake_condition_display}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code + Meta */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex justify-center">
              <TagQRCode tagCode={tagData.tag_code} animalTag={animal.tag_id} />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Tagged On</p>
                  <p className="font-medium text-gray-700">{tagData.date_tagged}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tagged By</p>
                  <p className="font-medium text-gray-700">{tagData.tagged_by_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Last Check-in</p>
                  <p className="font-medium text-gray-700">
                    {tagData.last_checkin
                      ? new Date(tagData.last_checkin).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tag Type</p>
                  <p className="font-medium text-gray-700">
                    {tagTypeLabels[tagData.tag_type]}
                  </p>
                </div>
              </div>
              {tagData.replacement_of && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    This is a replacement tag. Previous tag history is linked for continuity.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'overview', label: 'Custody Timeline', icon: Clock },
          { key: 'trail', label: 'Movement Trail', icon: MapPin },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Custody Lineage
          </h2>
          {loadingLineage ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading lineage...</p>
            </div>
          ) : (
            <CustodyLineageTimeline lineage={lineage} />
          )}
        </div>
      )}

      {activeTab === 'trail' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Movement Trail
          </h2>
          {loadingTrail ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading trail...</p>
            </div>
          ) : trailData?.properties?.points?.length > 0 ? (
            <CustodyTrailMap trailData={trailData} height="450px" />
          ) : (
            <div className="text-center py-8 text-gray-400">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No location data available for this tag.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
