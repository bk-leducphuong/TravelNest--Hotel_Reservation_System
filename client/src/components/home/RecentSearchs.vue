<template>
  <div class="recent-search-container container" v-if="recentSearches.length > 0">
    <h2 class="h2">{{ $t('userHome.recentSearches') }}</h2>
    <div class="slider-container">
      <ElCarousel
        :interval="0"
        :arrow="groupedSearches.length > 1 ? 'hover' : 'never'"
        indicator-position="none"
        height="96px"
        class="search-carousel"
      >
        <ElCarouselItem v-for="(group, groupIndex) in groupedSearches" :key="groupIndex">
          <div class="search-group">
            <div
              class="search-card"
              v-for="(search, index) in group"
              :key="searchKey(search, groupIndex * itemsPerSlide + index)"
              @click="redirectToSearchResults(search)"
            >
              <div class="search-image">
                <img
                  v-if="searchImageSrc(search)"
                  :src="searchImageSrc(search)"
                  :alt="displayLocation(search)"
                  @error="onImageError"
                />
              </div>
              <div class="search-content">
                <h2 class="search-title">{{ displayLocation(search) }}</h2>
                <p class="search-details">
                  From {{ formatDate(getCheckIn(search)) }} to {{ formatDate(getCheckOut(search)) }}
                </p>
              </div>
              <button
                class="close-button"
                @click.stop="removeSearch(search, groupIndex * itemsPerSlide + index)"
              >
                ×
              </button>
            </div>
          </div>
        </ElCarouselItem>
      </ElCarousel>
    </div>
  </div>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';
  import { SearchService } from '@/services/search.service';
  import errorHandler from '@/request/errorHandler.js';
  import { getImageUrl } from '@/utils/images';

  export default {
    name: 'RecentSearchs',
    emits: ['update:recentSearches'],
    data() {
      return {
        recentSearches: [],
        windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
      itemsPerSlide() {
        if (this.windowWidth >= 1400) return 5;
        if (this.windowWidth >= 1200) return 4;
        if (this.windowWidth >= 768) return 3;
        return 2;
      },
      groupedSearches() {
        const groups = [];
        for (let i = 0; i < this.recentSearches.length; i += this.itemsPerSlide) {
          groups.push(this.recentSearches.slice(i, i + this.itemsPerSlide));
        }
        return groups;
      },
    },
    mounted() {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
      }
      this.loadRecentSearches();
    },
    beforeUnmount() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.handleResize);
      }
    },
    methods: {
      async loadRecentSearches() {
        if (!this.isUserAuthenticated) {
          this.recentSearches = localStorage.getItem('recentSearches')
            ? JSON.parse(localStorage.getItem('recentSearches'))
            : [];
          return;
        }
        try {
          // GET /api/v1/search/recent (authenticated only)
          const response = await SearchService.getRecentSearches(10);
          const list = response?.data?.searches ?? response?.searches ?? [];
          this.recentSearches = Array.isArray(list) ? list : [];
        } catch (error) {
          errorHandler(error);
          this.recentSearches = [];
        }
      },
      handleResize() {
        this.windowWidth = window.innerWidth;
      },
      displayLocation(search) {
        if (!search) return '';
        const city = search.city ?? search.location ?? '';
        const country = search.country ?? '';
        const parts = [city, country].filter(Boolean);
        return parts.length ? parts.join(', ') : '—';
      },
      getCheckIn(search) {
        return search?.checkIn ?? search?.check_in_date ?? '';
      },
      getCheckOut(search) {
        return search?.checkOut ?? search?.check_out_date ?? '';
      },
      formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
        return new Date(d).toLocaleDateString('vi-VN');
      },
      searchKey(search, index) {
        const key = search.city ?? search.location ?? '';
        const checkIn = this.getCheckIn(search);
        const created = search.createdAt ?? search.searchedAt ?? index;
        return `${key}-${checkIn}-${created}`;
      },
      searchImageSrc(search) {
        return getImageUrl(search?.image?.objectKey) || '';
      },
      onImageError(event) {
        event.target.style.display = 'none';
      },
      ...mapActions('search', [
        'updateLocation',
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateAdults',
        'updateChildren',
        'updateRooms',
      ]),
      redirectToSearchResults(search) {
        const checkIn = this.getCheckIn(search).split('T')[0];
        const checkOut = this.getCheckOut(search).split('T')[0];
        const location = search.city ?? search.location ?? search.country ?? '';
        let numberOfDays = search.nights ?? search.number_of_days;
        if (numberOfDays == null && checkIn && checkOut) {
          const a = new Date(checkIn);
          const b = new Date(checkOut);
          numberOfDays = Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
        }
        this.$router.push({
          name: 'SearchResults',
          query: {
            location,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults: search.adults ?? 1,
            children: search.children ?? 0,
            rooms: search.rooms ?? 1,
            numberOfDays: numberOfDays ?? 1,
          },
        });
      },
      removeSearch(_removedSearch, searchIndex) {
        const updatedSearches = [...this.recentSearches];
        updatedSearches.splice(searchIndex, 1);
        this.$emit('update:recentSearches', updatedSearches);
        if (!this.isUserAuthenticated) {
          localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .recent-search-container {
    margin-bottom: 30px;
    margin-top: 30px;
    position: relative;
  }

  .h2 {
    font-weight: bolder;
    display: block;
    font-size: 28px;
  }

  .slider-container {
    position: relative;
  }

  .search-carousel {
    :deep(.el-carousel__container) {
      height: 96px;
    }

    :deep(.el-carousel__item) {
      padding: 0 $spacing-sm;
    }
  }

  .search-group {
    display: flex;
    gap: $spacing-lg;
    justify-content: center;
    height: 100%;
    align-items: center;
  }

  .search-card {
    flex: 0 0 400px;
    background: $white;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    position: relative;
    transition: transform 0.3s;
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 1400px) {
      flex: 0 0 calc((100% - 60px) / 4);
      max-width: 400px;
    }

    @media (max-width: 1200px) {
      flex: 0 0 calc((100% - 40px) / 3);
      max-width: 400px;
    }

    @media (max-width: 768px) {
      flex: 0 0 calc((100% - 20px) / 2);
      max-width: 400px;
    }
  }

  .search-image {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }
  }

  .search-content {
    flex-grow: 1;
  }

  .search-title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 4px 0;
  }

  .search-details {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 0;
  }

  .close-button {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: $text-secondary;
    font-size: 25px;
    @include flex-center;
    z-index: 2;
    transition: color 0.2s ease;

    &:hover {
      color: $text-primary;
    }
  }
</style>
