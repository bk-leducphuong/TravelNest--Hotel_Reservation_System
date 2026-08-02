// store/search/actions.js
import { SearchService } from '@/services/search.service'

export default {
  updateLocation({ commit }, location) {
    commit('setLocation', location)
  },
  updateCheckInDate({ commit }, checkInDate) {
    commit('setCheckInDate', checkInDate)
  },
  updateCheckOutDate({ commit }, checkOutDate) {
    commit('setCheckOutDate', checkOutDate)
  },
  updateNumberOfDays({ commit }, numberOfDays) {
    commit('setNumberOfDays', numberOfDays)
  },
  updateAdults({ commit }, adults) {
    commit('setAdults', adults)
  },
  updateChildren({ commit }, children) {
    commit('setChildren', children)
  },
  updateRooms({ commit }, rooms) {
    commit('setRooms', rooms)
  },
  async saveSearchInformation({ state }) {
    try {
      const searchData = {
        location: state.searchData.location,
        checkInDate: state.searchData.checkInDate,
        checkOutDate: state.searchData.checkOutDate,
        adults: state.searchData.adults,
        children: state.searchData.children,
        rooms: state.searchData.rooms,
        numberOfDays: state.searchData.numberOfDays
      }

      // save search information to localStorage
      const searchHistory = localStorage.getItem('recentSearches')
        ? JSON.parse(localStorage.getItem('recentSearches'))
        : []
      if (searchHistory.length > 10) {
        searchHistory.shift()
      }

      searchHistory.push({
        city: searchData.location,
        checkIn: searchData.checkInDate,
        checkOut: searchData.checkOutDate,
        adults: searchData.adults,
        children: searchData.children,
        rooms: searchData.rooms,
        nights: searchData.numberOfDays
      })

      searchHistory.reverse()
      localStorage.setItem('recentSearches', JSON.stringify(searchHistory))

      // save search information to database
      await SearchService.saveSearch(searchData)
    } catch (error) {
      console.error(error)
    }
  }
}
