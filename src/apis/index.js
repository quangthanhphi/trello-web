import axios from 'axios'
import { API_ROOT } from '~/utils/constants'


/*
 Tất cả function sẽ lấy data từ response, không có try catch, vì ở Front-end không cần thiết làm với mọi request vì
 sẽ gây dư thừa code catch lỗi
 Giải pháp clean code là sẽ catch lỗi tập trung bằng thứ trong axios là Interceptors
 Interceptors là đánh chặn giữa request hoặc response để xử lý logic
*/

export const fetchBoardDetailsAPI = async (boardId) => {
  const response = await axios.get(`${API_ROOT}/v1/boards/${boardId}`)

  // Lưu ý: axios sẽ trả về kết quả qua property của nó là data
  return response.data
}