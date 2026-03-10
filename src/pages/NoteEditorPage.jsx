import { useParams } from 'react-router-dom'
import NoteEditor from '../components/editor/NoteEditor'

export default function NoteEditorPage() {
  const { id } = useParams()
  return <NoteEditor noteId={id} />
}
