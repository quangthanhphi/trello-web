import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'
import {
  DndContext,
  // PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { useEffect, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { cloneDeep } from 'lodash'

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

  useEffect(() => {
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  //Tim column theo card id
  const findColumnByCardId = (cardId) => {
    //nen dung c.cards thay vi c.cardOrderIds boi vi o buoc handleDragOver se lam du lieu
    // cho cards hoan chinh truoc roi moi tao ra cardOrderIds moi
    return orderedColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
  }

  //Trigger khi bat dau keo(drag) 1 phan tu
  const handleDragStart = (event) => {
    // console.log('handleDragStart::', event)
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current)
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
    if ( !activeColumn || !overColumn ) return

    //Xu li khi keo card qua 2 column khac nhau, con neu keo card trong 1 column thi khong lam gi
    //O day chi xu li keo (handleDragOver)
    if (activeColumn._id !== overColumn._id ) {
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

          //cap nhat lai mang cardOrderIds cho chuan du lieu
          nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
        }

        //Column moi
        if (nextOverColumn) {
          //Kiem tra card dang keo co ton tai o overColumn chua, neu co thi xoa truoc
          nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)

          //tiep theo la them card dang keo vao overColumn theo vi tri index moi
          nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, activeDraggingCardData)

          //cap nhat lai mang cardOrderIds cho chuan du lieu
          nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
        }
        return nextColumns
      })
    }
  }

  //Trigger khi ket thuc hanh dong keo(drag) 1 phan tu => hanh dong tha(drop)
  const handleDragEnd = (event) => {

    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      return
    }
    // console.log('handleDragEnd::', event)
    const { active, over } = event

    //Can dam bao neu khong ton tai active hoac over (khi keo ra khoi pham vi container) thi khong lam gi (tranh crash)
    if (!active || !over) return

    //Neu vi tri sau khi keo tha khac vi tri ban dau
    if (active.id !== over.id) {
      //Lay vi tri cu (cua thang active)
      const oldIndex = orderedColumns.findIndex(c => c._id === active.id)
      //Lay vi tri moi (cua thang over)
      const newIndex = orderedColumns.findIndex(c => c._id === over.id)

      //code cua arraymove: packages/sortable/src/utilities/arrayMove.ts
      const dndOrderedColumns = arrayMove(orderedColumns, oldIndex, newIndex)
      // const dndOrderedColumnsIds = dndOrderedColumns.map(c => c._id)
      // console.log('dndOrderedColumns: ', dndOrderedColumns)
      // console.log('dndOrderedColumnsIds: ', dndOrderedColumnsIds)
      setOrderedColumns(dndOrderedColumns)
    }

    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
  }

  //Animation khi tha(drop) 1 phan tu
  const customDropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } })
  }

  return (
    <DndContext
      sensors={sensors}
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
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN ) && <Column column={activeDragItemData} />}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD ) && <Card card={activeDragItemData} />}
        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent
