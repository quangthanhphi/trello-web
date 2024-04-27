import axios from 'axios'
import { API_ROOT } from '~/utils/constants'


/*
 Tất cả function sẽ lấy data từ response, không có try catch, vì ở Front-end không cần thiết làm với mọi request vì
 sẽ gây dư thừa code catch lỗi
 Giải pháp clean code là sẽ catch lỗi tập trung bằng thứ trong axios là Interceptors
 Interceptors là đánh chặn giữa request hoặc response để xử lý logic
*/

/** Boards */
export const fetchBoardDetailsAPI = async (boardId) => {
  const response = await axios.get(`${API_ROOT}/v1/boards/${boardId}`)

  // Lưu ý: axios sẽ trả về kết quả qua property của nó là data
  return response.data
}

export const updateBoardDetailsAPI = async (boardId, updateData) => {
  const response = await axios.put(`${API_ROOT}/v1/boards/${boardId}`, updateData )
  return response.data
}

/** Columns */
export const createNewColumnAPI = async (newColumnData) => {
  const response = await axios.post(`${API_ROOT}/v1/columns`, newColumnData )
  return response.data
}

export const updateColumnDetailsAPI = async (columnId, updateData) => {
  const response = await axios.put(`${API_ROOT}/v1/columns/${columnId}`, updateData )
  return response.data
}

/** Cards*/
export const createNewCardAPI = async (newCardData) => {
  const response = await axios.post(`${API_ROOT}/v1/cards`, newCardData )
  return response.data
}