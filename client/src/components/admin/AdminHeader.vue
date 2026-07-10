<script>
import socket from '@/services/socket'
import axios from 'axios'
import { mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import { getFirstImageUrl } from '@/utils/images'
export default {
  components: {
    LanguageSwitch
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      isNotificationPopupVisible: false,
      notifications: [],
      numberOfNewNotifications: 0,
      haveNewNotifications: false,
      showLanguagePopup: false
    }
  },
  computed: {
    ...mapGetters('manageHotels', [
      'getCurrentManagingHotelInformation',
      'getCurrentManagingHotelId'
    ]),
    ...mapGetters('user', ['getUserLanguage']),
    flagUrl() {
      const lang = this.getUserLanguage;
      if (!lang) return 'https://flagcdn.com/w40/us.png';
      const parts = lang.split('-');
      const countryCode = parts[1] || parts[0];
      return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
    },
  },
  watch: {
    notifications(newValue) {
      this.calculateNumerOfNewNotifications()
    }
  },
  methods: {
    showNotificationIcon() {},
    joinRoom() {
      if (this.getCurrentManagingHotelId) {
        // Tham gia vào room của admin
        socket.emit('joinAdminRoom', this.getCurrentManagingHotelId)
        // Nhận thông báo mới
        socket.on('newAdminNotification', (data) => {
          this.notifications.unshift(data)
          this.numberOfNewNotifications++
          this.haveNewNotifications = true
        })
      } else {
        console.log('User not logged in')
      }
    },
    async getNotifiactions() {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_HOST}/api/admin/notifications`,
        {
          hotelId: this.getCurrentManagingHotelId
        },
        {
          withCredentials: true
        }
      )
      this.notifications = response.data.notifications
    },
    async markAllRead() {
      try {
        this.notifications.forEach((notification) => {
          notification.is_read = 1
        })
        this.numberOfNewNotifications = 0

        await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/notifications/mark-all-as-read`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )
      } catch (error) {
        this.toast.error('Error marking notifications as read')
        console.error(error)
      }
    },
    calculateNumerOfNewNotifications() {
      this.numberOfNewNotifications = 0
      this.notifications.forEach((notification) => {
        if (notification.is_read == 0) {
          this.numberOfNewNotifications++
        }
      })
    },
    hideNotficationPopup() {
      this.isNotificationPopupVisible = false
      if (this.haveNewNotifications) {
        this.haveNewNotifications = false
      }
    },
    openNotificationPopup() {
      this.isNotificationPopupVisible = !this.isNotificationPopupVisible
    },
    async viewDetails(notification) {
      const notificationType = notification.notification_type
      const notificationId = notification.notification_id

      let route = `/admin/${this.getCurrentManagingHotelId}`

      switch (notificationType) {
        case 'booking':
          route = route + '/bookings/all'
          this.$router.push(route)
          break
        case 'cancel booking':
          route = route + '/bookings/all'
          this.$router.push(route)
          break
        default:
          break
      }

      await axios.post(
        `${import.meta.env.VITE_SERVER_HOST}/api/admin/notifications/mark-as-read`,
        {
          notificationId: notificationId
        },
        {
          withCredentials: true
        }
      )
    },
    openLanguagePopup() {
      this.showLanguagePopup = !this.showLanguagePopup
    },
    closeLanguagePopup() {
      this.showLanguagePopup = false
    },
    serverHost() {
      return import.meta.env.VITE_SERVER_HOST
    },
    getFirstImageUrl
    
  },
  mounted() {
    this.getNotifiactions()
    this.joinRoom()
  }
}
</script>
<template>
  <LanguageSwitch @close-language-popup="closeLanguagePopup" v-if="showLanguagePopup" />
  <header class="top-header">
    <div class="header-container">
      <!-- account  -->
      <div class="header-right">
        <div class="user-profile">
          <div class="avatar">
            <img
              v-if="getCurrentManagingHotelInformation.image_urls"
              :src="getFirstImageUrl(getCurrentManagingHotelInformation.image_urls)"
              alt="avatar"
              style="width: 45px; height: 45px; border-radius: 10px; object-fit: cover"
            />
            <img
              v-else
              :src="serverHost() + '/uploads/hotels/no-image.png'"
              alt="avatar"
              style="width: 45px; height: 45px; border-radius: 10px; object-fit: cover"
            />
          </div>
          <div class="hotel-infor">
            <span v-if="getCurrentManagingHotelInformation" style="font-weight: 600">{{
              getCurrentManagingHotelInformation.name
            }}</span>
            <span>
              <i class="fa-solid fa-location-dot"></i
              >{{ getCurrentManagingHotelInformation.address.slice(0, 35) }}</span
            >
          </div>

          <!-- <span v-else>Hotel</span> -->
        </div>
      </div>
      <div class="function-button">
        <div @click="openLanguagePopup()" class="language-btn">
          <img :src="flagUrl" alt="Vietnam" />
        </div>

        <div>
          <i class="fa-regular fa-circle-question" style="font-size: 23px"></i>
        </div>
        <!-- notification popup -->
        <div class="notification-container" v-click-outside="hideNotficationPopup">
          <div class="notification-icon" @click="openNotificationPopup">
            <span class="notification-badge" v-if="numberOfNewNotifications > 0">{{
              numberOfNewNotifications
            }}</span>
            <i class="fa-regular fa-bell"></i>
          </div>
        </div>
      </div>
      <div class="notification-popup" v-if="isNotificationPopupVisible || haveNewNotifications">
        <div class="notification-header">
          <div class="notification-title">
            <span>Notifications</span>
          </div>
          <div class="mark-all-read-btn">
            <span @click="markAllRead()">Mark all as read</span>
          </div>
        </div>
        <div class="notification-content">
          <div
            class="notification-item"
            v-if="notifications.length == 0"
            style="justify-content: space-around"
          >
            <div class="notification-text">
              <h4>You have no notifications</h4>
            </div>
          </div>
          <div
            class="notification-item"
            v-for="notification in notifications"
            :key="notification.notificationId"
            @click="viewDetails(notification)"
          >
            <div class="notification-icon">
              <i class="fas fa-arrow-up"></i>
            </div>
            <div class="notification-text">
              <h4>
                <i
                  class="fa fa-circle"
                  aria-hidden="true"
                  style="color: red; font-size: 10px"
                  v-if="notification.is_read == 0"
                ></i>
                {{ notification.message }}
              </h4>
              <p>2 hrs ago</p>
            </div>
          </div>
        </div>
        <div class="notification-footer">
          <span class="see-all-button">See all</span>
        </div>
      </div>
    </div>
  </header>
</template>
<style scoped>
.top-header {
  height: 64px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  /* justify-content: space-between; */
  align-items: center;
  padding: 0 24px;
}

.header-container {
  /* position: absolute; */
  right: 15px;
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar {
  width: 45px;
  height: 45px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-right: 12px;
  flex-shrink: 0;
  background-color: gray;
}

.hotel-infor {
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  gap: 5px;
}
.function-button {
  display: flex;
  align-items: center;
  gap: 30px;
}

.function-button div {
  width: 30px;
  height: 30px;
  cursor: pointer;
  text-align: center;
  display: flex;
  align-items: center;
}
.language-btn {
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.language-btn img {
  width: inherit;
  height: inherit;
  object-fit: cover;
  border-radius: 50%;
}
/* notification */
.notification-icon {
  cursor: pointer;
}

.notification-badge {
  padding: 0px 5px;
  position: absolute;
  font-size: 15px;
  background-color: red;
  border-radius: 5px;
  color: #fff;
  top: -5px;
  right: -5px;
}

.notification-popup {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 350px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  z-index: 9999;
}

/* notification header */
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.notification-title {
  font-size: 17px;
  color: #7f8c8d;
  padding: 10px;
}
.mark-all-read-btn {
  color: #3498db;
  font-size: 15px;
  cursor: pointer;
  padding: 10px;
}

.notification-content {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f2f2f2;
}

.notification-item:hover {
  background-color: #f2f2f2;
}

.notification-icon {
  margin-right: 12px;
  font-size: 24px;
  position: relative;
  /* color: #00b894; */
}

.notification-text h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.notification-text p {
  margin: 0;
  font-size: 12px;
  color: #7f8c8d;
}

.notification-footer {
  padding: 12px;
  text-align: center;
  border-top: 1px solid #f2f2f2;
}

.see-all-button {
  color: #3498db;
  cursor: pointer;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #3498db;
  color: #fff;
  border: none;
}

.btn-primary:hover {
  background-color: #2980b9;
}
</style>
