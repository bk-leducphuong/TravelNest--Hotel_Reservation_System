<template>
  <LanguageSwitch @close-language-popup="closeLanguagePopup" v-if="showLanguagePopup" />
  <div :class="headerClass">
    <div class="container" v-if="useContainer">
      <div class="inner-wrap">
        <div class="inner-logo">
          <a @click="this.$router.push('/')"><strong>TravelNest</strong></a>
        </div>
        <div class="inner-login">
          <ul>
            <li><strong>USD</strong></li>
            <li @click="openLanguagePopup()">
            <img :src="flagUrl" :style="imageStyle" alt="Language" />
            </li>
            <li><i class="fa-regular fa-circle-question"></i></li>
            <!-- Slot for additional navigation items -->
            <slot name="nav-items"></slot>
          </ul>
        </div>
      </div>
    </div>
    <div class="inner-wrap" v-else>
      <div class="inner-logo">
        <strong><a @click="this.$router.push('/')">TravelNest</a></strong>
      </div>
      <div class="inner-login">
        <ul>
          <li><strong>USD</strong></li>
          <li @click="openLanguagePopup()">
            <img :src="flagUrl" :style="imageStyle" alt="Language" />
          </li>
          <li><i class="fa-regular fa-circle-question"></i></li>
          <!-- Slot for additional navigation items -->
          <slot name="nav-items"></slot>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
  import LanguageSwitch from '../LanguageSwitch.vue';
  import { mapGetters } from 'vuex';

  export default {
    name: 'BaseHeader',
    components: {
      LanguageSwitch,
    },
    props: {
      useContainer: {
        type: Boolean,
        default: true,
      },
      headerClass: {
        type: String,
        default: 'header',
      },
    },
    data() {
      return {
        showLanguagePopup: false,
      };
    },
    computed: {
      ...mapGetters('user', ['getUserLanguage']),
      flagUrl() {
        const lang = this.getUserLanguage;
        if (!lang) return 'https://flagcdn.com/w40/us.png';
        const parts = lang.split('-');
        const countryCode = parts[1] || parts[0];
        return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
      },
      imageStyle() {
        return {
          width: '20px',
          height: '20px',
          cursor: this.useContainer ? 'default' : 'pointer',
        };
      },
    },
    methods: {
      openLanguagePopup() {
        this.showLanguagePopup = !this.showLanguagePopup;
      },
      closeLanguagePopup() {
        this.showLanguagePopup = false;
      },
    },
  };
</script>

<style scoped>
  .header {
    background-color: #003b95;
    padding-bottom: 30px;
  }

  .header .inner-wrap {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    align-items: center;
  }

  .header .inner-logo strong {
    font-size: 24px;
    color: #fff;
  }

  .header .inner-logo a {
    color: #fff;
    text-decoration: none;
    cursor: pointer;
  }

  .header .inner-login ul {
    display: flex;
    color: #fff;
    list-style-type: none;
    align-items: center;
    margin-bottom: 0;
  }

  .header .inner-login ul li {
    padding: 10px;
    margin-left: 15px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 14px;
  }

  .header .inner-login ul li:hover {
    background-color: #1a4fa0;
  }

  .header .inner-login ul li img {
    border-radius: 50%;
    height: 18px;
    overflow: hidden;
    width: auto;
  }

  .header .inner-login ul li span {
    font-weight: 600;
  }

  .header .inner-login ul li i {
    font-size: 21px;
  }

  .header .inner-login ul .login {
    padding: 5px 10px;
    color: #1d5fc2;
    font-weight: 500;
    background-color: #fff;
    border-radius: 5px;
  }

  .header .inner-login ul .login:hover {
    background-color: #f0f6fd;
  }
</style>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .header-container {
    padding: 0 $spacing-xl;
    background-color: $primary-color;

    .inner-wrap {
      @include flex-between;
      padding: 12px 0;
    }

    .inner-logo strong {
      font-size: $font-size-lg;
      color: $white;

      a {
        color: $white;
        text-decoration: none;
        cursor: pointer;
      }
    }

    .inner-login ul {
      @include flex-between;
      color: $white;
      list-style-type: none;
      margin-bottom: 0;

      li {
        padding: $spacing-sm;
        margin-left: $spacing-md;
        border-radius: $border-radius-md;
        @include flex-center;
        font-size: $font-size-sm;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: $primary-color-dark;
        }

        img {
          border-radius: 50%;
          height: 18px;
          overflow: hidden;
          width: auto;
        }

        span {
          font-weight: 600;
        }
      }

      .login,
      .guides {
        padding: $spacing-xs $spacing-sm;
        color: $secondary-color;
        font-weight: 500;
        background-color: $white;
        border-radius: $border-radius-md;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: $background-light;
        }
      }
    }
  }
</style>

