<template>
  <div class="hotel-container container" v-if="viewedHotels.length > 0">
    <h2 class="h2">{{ $t('userHome.viewedHotels') }}</h2>
    <div class="slider-container">
      <Loading
        v-model:active="isLoading"
        :can-cancel="true"
        :color="`#003b95`"
        :is-full-page="false"
      />
      <ElCarousel
        :interval="0"
        :arrow="groupedHotels.length > 1 ? 'hover' : 'never'"
        indicator-position="none"
        height="360px"
        class="hotel-carousel"
      >
        <ElCarouselItem v-for="(group, groupIndex) in groupedHotels" :key="groupIndex">
          <div class="hotel-group">
            <div
              class="hotel-card"
              v-for="(hotel, index) in group"
              :key="hotel.id || index"
              @click="redirectToHotelDetails(hotel)"
            >
              <div class="hotel-image">
                <img
                  v-if="hotel.primaryImageUrl"
                  :src="getImageUrl(hotel.primaryImageUrl)"
                  :alt="hotel.name"
                />
                <SavedHotelIcon :hotel-id="hotel.id" />
              </div>
              <div class="hotel-content">
                <h2 class="hotel-name">{{ hotel.name }}</h2>
                <p class="hotel-location">{{ displayAddress(hotel.address) }}</p>
                <div class="hotel-rating" v-if="hotel.ratingSummary">
                  <span class="rating-badge">{{ hotel.ratingSummary.overallRating }}</span>
                  <span class="review-count">{{ hotel.ratingSummary.totalReviews }} đánh giá</span>
                </div>
              </div>
            </div>
          </div>
        </ElCarouselItem>
      </ElCarousel>
    </div>
  </div>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';
  import Loading from 'vue-loading-overlay';
  import 'vue-loading-overlay/dist/css/index.css';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { HotelService } from '@/services/hotel.service';
  import errorHandler from '@/request/errorHandler.js';
  import { getImageUrl } from '@/utils/images';

  export default {
    name: 'ViewedHotels',
    components: {
      Loading,
      SavedHotelIcon,
    },
    data() {
      return {
        viewedHotels: [],
        isLoading: false,
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
      groupedHotels() {
        const groups = [];
        for (let i = 0; i < this.viewedHotels.length; i += this.itemsPerSlide) {
          groups.push(this.viewedHotels.slice(i, i + this.itemsPerSlide));
        }
        return groups;
      },
    },
    mounted() {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
      }
      this.loadViewedHotels();
    },
    beforeUnmount() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.handleResize);
      }
    },
    methods: {
      getImageUrl,
      handleResize() {
        this.windowWidth = window.innerWidth;
      },
      displayAddress(address) {
        if (!address) return '';
        return address.length > 35 ? `${address.slice(0, 35)} ...` : address;
      },
      ...mapActions('search', ['updateLocation']),
      redirectToHotelDetails(hotel) {
        const hotelId = hotel.id;
        const cityName = hotel.city?.name ?? hotel.city ?? '';
        if (cityName) this.updateLocation(cityName);

        // Keep localStorage in sync for consistency (view is recorded by GET hotel details)
        const viewedHotels = localStorage.getItem('viewedHotels')
          ? JSON.parse(localStorage.getItem('viewedHotels'))
          : [];
        const index = viewedHotels.findIndex((id) => id === hotelId);
        if (index !== -1) viewedHotels.splice(index, 1);
        viewedHotels.push(hotelId);
        localStorage.setItem('viewedHotels', JSON.stringify(viewedHotels));

        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } });
      },
      async loadViewedHotels() {
        try {
          this.isLoading = true;

          if (!this.isUserAuthenticated) {
            const raw = localStorage.getItem('viewedHotels');
            const ids = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(ids) || ids.length === 0) {
              this.viewedHotels = [];
              return;
            }

            const response = await HotelService.getHotelsByIds(ids);
            const list = response?.data ?? response ?? [];
            this.viewedHotels = Array.isArray(list) ? list : [];
            return;
          }

          const response = await HotelService.getRecentlyViewed(10);
          const list = response?.data ?? response ?? [];
          this.viewedHotels = Array.isArray(list) ? list : [];
        } catch (error) {
          errorHandler(error);
          this.viewedHotels = [];
        } finally {
          this.isLoading = false;
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .hotel-container {
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

  .hotel-carousel {
    :deep(.el-carousel__container) {
      height: 360px;
    }

    :deep(.el-carousel__item) {
      padding: 0 $spacing-sm;
    }
  }

  .hotel-group {
    display: flex;
    gap: $spacing-lg;
    justify-content: center;
    height: 100%;
    align-items: flex-start;
  }

  .hotel-card {
    height: 360px;
    flex: 0 0 280px;
    background: $white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    transition: transform 0.3s;
    cursor: pointer;

    &:hover {
      transform: translateY(-5px);
    }

    @media (max-width: 1400px) {
      flex: 0 0 calc((100% - 60px) / 4);
      max-width: 280px;
    }

    @media (max-width: 1200px) {
      flex: 0 0 calc((100% - 40px) / 3);
      max-width: 280px;
    }

    @media (max-width: 768px) {
      flex: 0 0 calc((100% - 20px) / 2);
      max-width: 280px;
    }
  }

  .hotel-image {
    position: relative;
    height: 60%;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 0;
    }
  }

  .hotel-content {
    height: 40%;
    padding: 15px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hotel-name {
    font-size: $font-size-base;
    font-weight: 600;
    margin: 0 0 5px 0;
    color: $text-primary;
  }

  .hotel-location {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 0 0 10px 0;
  }

  .hotel-rating {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  .rating-badge {
    background: $primary-color;
    color: $white;
    padding: 4px 8px;
    border-radius: $border-radius-sm;
    font-weight: bold;
  }

  .rating-text {
    font-size: $font-size-sm;
    color: $text-primary;
  }

  .review-count {
    color: $text-secondary;
    font-size: $font-size-sm;
  }
</style>
