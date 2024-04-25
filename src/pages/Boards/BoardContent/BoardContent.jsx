import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'
import {
  DndContext,
  // PointerSensor,
  // MouseSensor,
  // TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  closestCorners,
  // closestCenter,
  pointerWithin,
  // rectIntersection,
  getFirstCollision
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor } from '~/customLibraries/DndKitSensors'
import { useEffect, useState, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { cloneDeep, isEmpty } from 'lodash'
import { generatePlaceholderCard } from '~/utils/formatters'

import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}

function BoardContent({ board }) {
  // https://docs.dndkit.com/api-documentation/sensors#usesensor
  // const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 10 } })

  // Sensors) Yêu cầu chuột di chuyển 10px thì mới kích hoạt, fix trường hợp click bị gọi event
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })

  //Nhan giu 250ms va di chuyen/chenh lech 500px thi moi kich hoat event
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })

  //Uu tien su dung mouseSensor va touchSensor de co trai nghiem tren mobile tot nhat, khong bi bug
  // const sensors = useSensors(pointerSensor)
  const sensors = useSensors(mouseSensor, touchSensor)

  const [orderedColumns, setOrderedColumns] = useState([])

  //Cung 1 thoi diem, chi co 1 column dang duoc keo (column hoac card)
  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] = useState(null)

  // Điểm va chạm cuối cùng, xử lý thuật toán phát hiện va chạm
  const lastOverId = useRef(null)

  useEffect(() => {
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  //Tim column theo card id
  const findColumnByCardId = (cardId) => {
    //nen dung c.cards thay vi c.cardOrderIds boi vi o buoc handleDragOver se lam du lieu
    // cho cards hoan chinh truoc roi moi tao ra cardOrderIds moi
    return orderedColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
  }

  //Function chung xử lý việc cập nhật lại state trong trường hợp di chuyển Card giữa các Column khác nhau
  const moveCardBetweenDifferentColumns = (
    overColumn,
    overCardId,
    active,
    over,
    activeColumn,
    activeDraggingCardId,
    activeDraggingCardData
  ) => {
    setOrderedColumns(prevColumns => {
      //Tim vi tri cua overCard trong column dich(noi activeCard sap duoc tha)
      const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)

      //logic tinh toan "cardIndex moi" (tren hoac duoi cua overCard) lay chuan ra tu code cua thu vien
      let newCardIndex
      const isBelowOverItem = active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height

      const modifier = isBelowOverItem ? 1 : 0
      newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1

      //Clone mang OrderColumnsState cu ra mot cai moi de xu ly data roi return - cap nhat lai OrderedColumnsState moi
      const nextColumns = cloneDeep(prevColumns)
      const nextActiveColumn = nextColumns.find(column => column._id === activeColumn._id)
      const nextOverColumn = nextColumns.find(column => column._id === overColumn._id)

      //Column cu~
      if (nextActiveColumn) {
        //xoa Card o column active (cung co the hieu la column cu~, luc ma keo card ra khoi no de sang column khac)
        nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)

        // Thêm placeholder card nếu column rỗng: bị kéo hết card đi, không còn cái nào nữa
        if (isEmpty(nextActiveColumn.cards)) {
          nextActiveColumn.cards = [generatePlaceholderCard(nextActiveColumn)]
        }

        //cap nhat lai mang cardOrderIds cho chuan du lieu
        nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
      }

      //nextOverColumn: Column moi
      if (nextOverColumn) {
        //Kiem tra card dang keo co ton tai o overColumn chua, neu co thi xoa truoc
        nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)

        // Đối với trường hợp dragEnd thì phải cập nhật lại chuẩn dữ liệu columnId trong card sau khi kéo card giữa 2 column khác nhau
        const rebuild_activeDraggingCardData = {
          ...activeDraggingCardData,
          columnId: nextOverColumn._id
        }

        //tiep theo la them card dang keo vao overColumn theo vi tri index moi
        nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, rebuild_activeDraggingCardData)

        // Xóa placeholderCard đi nếu nó đang tồn tại
        nextOverColumn.cards = nextOverColumn.cards.filter(card => !card.FE_PlaceholderCard)

        //cap nhat lai mang cardOrderIds cho chuan du lieu
        nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
      }
      return nextColumns
    })
  }

  //Trigger khi bat dau keo(drag) 1 phan tu
  const handleDragStart = (event) => {
    // console.log('handleDragStart::', event)
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current)

    // Nếu là kéo card thì mới thực hiện hành động set giá trị oldColumn
    if (event?.active?.data?.current?.columnId) {
      setOldColumnWhenDraggingCard(findColumnByCardId(event?.active?.id))
    }
  }

  //Trigger trong qua trinh keo 1 phan tu
  const handleDragOver = (event) => {
    //Khong lam gi them neu dang keo column
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return

    // console.log('handleDragOver::', event)
    //Neu keo card thi xu li them keo card qua lai giua cac column
    const { active, over } = event

    //Can dam bao neu khong ton tai active hoac over (khi keo ra khoi pham vi container) thi khong lam gi (tranh crash)
    if (!active || !over) return

    //activeDraggingCard: La card dang duoc keo
    const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
    //OverCard: la card dang tuong tac tren hoac duoi so voi card dang duoc keo o tren
    const { id: overCardId } = over

    //Tim 2 cai column theo card id
    const activeColumn = findColumnByCardId(activeDraggingCardId)
    const overColumn = findColumnByCardId(overCardId)

    //Neu khong ton tai 1 trong 2 column thi khong lam gi, tranh crash
    if (!activeColumn || !overColumn) return

    //Xu li khi keo card qua 2 column khac nhau, con neu keo card trong 1 column thi khong lam gi
    //O day chi xu li keo (handleDragOver)
    if (activeColumn._id !== overColumn._id) {
      moveCardBetweenDifferentColumns(
        overColumn,
        overCardId,
        active,
        over,
        activeColumn,
        activeDraggingCardId,
        activeDraggingCardData
      )
    }
  }

  //Trigger khi ket thuc hanh dong keo(drag) 1 phan tu => hanh dong tha(drop)
  const handleDragEnd = (event) => {

    // console.log('handleDragEnd::', event)
    const { active, over } = event

    //Can dam bao neu khong ton tai active hoac over (khi keo ra khoi pham vi container) thi khong lam gi (tranh crash)
    if (!active || !over) return

    // Xử lí kéo thả cards
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      //activeDraggingCard: La card dang duoc keo
      const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
      //OverCard: la card dang tuong tac tren hoac duoi so voi card dang duoc keo o tren
      const { id: overCardId } = over

      //Tim 2 cai column theo card id
      const activeColumn = findColumnByCardId(activeDraggingCardId)
      const overColumn = findColumnByCardId(overCardId)

      //Neu khong ton tai 1 trong 2 column thi khong lam gi, tranh crash
      if (!activeColumn || !overColumn) return

      // Hành động kéo thả card giữa 2 column khác nhau
      //Phải dùng tới activeDragItemData.columnId hoặc oldColumnWhenDraggingCard(set vào state từ bước handleDragStart) chứ không phải
      //activeData trong scope handleDragEnd
      //này vì sau khi di qua handleDragOver tới đây là state của card đã bị cập nhật 1 lần
      if (oldColumnWhenDraggingCard._id !== overColumn._id) {
        moveCardBetweenDifferentColumns(
          overColumn,
          overCardId,
          active,
          over,
          activeColumn,
          activeDraggingCardId,
          activeDraggingCardData
        )
      } else {
        //Hành động kéo thả card trong cùng 1 column

        //Lay vi tri cu (cua thang oldColumnWhenDraggingCard)
        const oldCardIndex = oldColumnWhenDraggingCard?.cards?.findIndex(c => c._id === activeDragItemId)
        //Lay vi tri moi (cua thang overColumn)
        const newCardIndex = overColumn?.cards?.findIndex(c => c._id === overCardId)

        //Dùng arrayMove vì kéo card trong 1 column tương tự với logic kéo column trong boardContent
        const dndOrderedCards = arrayMove(oldColumnWhenDraggingCard?.cards, oldCardIndex, newCardIndex)

        setOrderedColumns(prevColumns => {
          //Clone mang OrderColumnsState cu ra mot cai moi de xu ly data roi return - cap nhat lai OrderedColumnsState moi
          const nextColumns = cloneDeep(prevColumns)

          //Tìm tới column mà chúng ta đang thả
          const targetColumn = nextColumns.find(column => column._id === overColumn._id)

          //cập nhật lại 2 giá trị mới là card và cardOrderIds trong cái targetColumn
          targetColumn.cards = dndOrderedCards
          targetColumn.cardOrderIds = dndOrderedCards.map(card => card._id)

          //Trả về giá trị state mới (chuẩn vị trí)
          return nextColumns
        })
      }

    }

    // Xử lí kéo thả columns trong một boardContent
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      //Neu vi tri sau khi keo tha khac vi tri ban dau
      if (active.id !== over.id) {
        //Lay vi tri cu (cua thang active)
        const oldColumnIndex = orderedColumns.findIndex(c => c._id === active.id)
        //Lay vi tri moi (cua thang over)
        const newColumnIndex = orderedColumns.findIndex(c => c._id === over.id)

        //code cua arraymove: packages/sortable/src/utilities/arrayMove.ts
        const dndOrderedColumns = arrayMove(orderedColumns, oldColumnIndex, newColumnIndex)
        // const dndOrderedColumnsIds = dndOrderedColumns.map(c => c._id)
        // console.log('dndOrderedColumns: ', dndOrderedColumns)
        // console.log('dndOrderedColumnsIds: ', dndOrderedColumnsIds)
        setOrderedColumns(dndOrderedColumns)
      }
    }

    // Những dữ liệu sau khi kéo thả phải đưa về null ban đầu
    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
    setOldColumnWhenDraggingCard(null)
  }

  //Animation khi tha(drop) 1 phan tu
  const customDropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } })
  }

  // Custom lại thuật toán phát hiện va chạm tối ưu cho việc kéo thả card giữa nhiều column
  //args = arguments  (đối số, tham số)
  const collisionDetectionStrategy = useCallback((args) => {
    //  Trường hợp kéo column thì dùng thuật toán closestCorner
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      return closestCorners({ ...args })
    }

    // Tìm điểm giao nhau, va chạm,trả về một mảng các va chạm - intersection với con trỏ
    const pointerIntersections = pointerWithin(args)

    // Nếu pointerIntersections là mảng rỗng, return và không làm gì
    //Fix triệt để bug flickering của thư viện dnd-kit trong trường hợp:
    // - Kéo 1 column có image cover lớn và kéo lên trên phía trên cùng ra khỏi khu vực kéo thả
    if (!pointerIntersections?.length) return

    // Thuật toán phát hiện va chạm sẽ trả về một mảng các va chạm ở đây (để fix bug nhấp nháy ở trên đầu column thì không cần đoạn này nữa)
    // const intersections = !!pointerIntersections?.length //pointerIntersections?.length > 0
    //   ? pointerIntersections
    //   : rectIntersection(args)

    // Tìm overId đầu tiên trong đám intersections ở trên
    let overId = getFirstCollision(pointerIntersections, 'id')
    if (overId) {
      // Fix vụ flickering
      // Nếu over là column thì sẽ tìm tới cardId gần nhất bên trong khu vực va chạm đó dựa vào thuật toán phát hiện va chạm
      // closestCenter hoặc closestCorners đều được. Tuy nhiên ở đây dùng closestCorners mượt hơn
      const checkColumn = orderedColumns.find(column => column._id === overId)
      if (checkColumn) {
        //console.log('overId before: ', overId)
        overId = closestCorners ({
          ...args,
          droppableContainers: args.droppableContainers.filter(container => {
            return (container.id !== overId) && (checkColumn?.cardOrderIds?.includes(container.id))
          })
        })[0]?.id
        //console.log('overId before: ', overId)
      }

      lastOverId.current = overId
      return [{ id: overId }]
    }

    // Nếu overId là null thì trả về mảng rỗng - tránh bug
    return lastOverId.current ? [{ id: lastOverId.current }] : []
  }, [activeDragItemType, orderedColumns])


  return (
    <DndContext
      sensors={sensors}
      //Thuật toán phát hiện va chạm (nếu không có nó thì card với cover lớn sẽ không kéo qua Column khác được vì lúc
      // này nó đang bị conflict giữa card và column), dùng closestCorners thay vì closestCenter
      //https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms
      //Update: nếu chỉ sử dụng closestCorner sẽ có bug flickering + sai lệch dữ liệu
      // collisionDetection={closestCorners}
      // Tự custom thuật toán phát hiện va chạm
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
        width: '100%',
        height: (theme) => theme.trello.boardContentHeight,
        p: '10px 0'
      }}>
        <ListColumns columns={orderedColumns} />
        <DragOverlay dropAnimation={customDropAnimation}>
          {!activeDragItemType && null} {/* neu la null thi dragoverlay khong lam gi */}
          {/* neu khac null thi render 1 column/card giu cho */}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) && <Column column={activeDragItemData} />}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) && <Card card={activeDragItemData} />}
        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent
