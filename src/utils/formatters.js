export const capitalizeFirstLetter = (val) => {
  if (!val) return ''
  return `${val.charAt(0).toUpperCase()}${val.slice(1)}`
}

/**
* Cách xử lí bug logic thư viện Dnd-kit khi column là rỗng:
* Phía FE sẽ tạo ra một card đặc biệt: Placeholder Card, không liên quan tới backend
* Card đặc biệt này sẽ được ẩn ở UI người dùng
* Cấu trúc Id của card này uniqeu rất đơn giản, không phức tạp
* "ColumnId-Placeholder-card" (mỗi column chỉ có thể có tối đa 1 Placeholdercard)
* Quan trọng khi tạo: phải đầy đủ(_id,boardId,columnId, FE_PlaceholderCard)
*/
export const generatePlaceholderCard = (column) => {
  return {
    _id: `${column._id}-placeholder-card`,
    boardId: column.boardId,
    column: column._id,
    FE_PlaceholderCard: true
  }
}