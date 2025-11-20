import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SettingsPage from './SettingsPage';
import EventDetailsPage from './EventDetailsPage';
import {
  Layout,
  Menu,
  Button,
  Typography,
  List,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Space,
  Calendar,
  Badge,
  Collapse,
  Select,
  Avatar,
  Tag,
  Popover,
  ColorPicker,
  Tooltip,
  Radio
} from 'antd';
import { LogoutOutlined, PlusOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined, MailOutlined, UserOutlined, CheckOutlined, CloseOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;

/**
 * คำนวณสถานะของ Event เทียบกับ "วันนี้"
 * @param {string | Date} startTime เวลาเริ่มของ Event
 * @returns {{status: 'success'|'warning'|'error', text: string}}
 */

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const getEventStatus = (startTime) => {
  const now = dayjs().startOf('day'); // วันนี้ (ตอนเที่ยงคืน)
  const eventStart = dayjs(startTime).startOf('day'); // วันเริ่ม Event (ตอนเที่ยงคืน)

  // คำนวณส่วนต่างเป็น "วัน"
  const diff = eventStart.diff(now, 'day');

  if (diff < 0) {
    // 🟥 ผ่านไปแล้ว (สีแดง)
    return { status: 'error', text: `${Math.abs(diff)} วันที่แล้ว` };
  }
  if (diff === 0) {
    // 🟨 วันนี้ (สีเหลือง)
    return { status: 'warning', text: 'วันนี้' };
  }
  if (diff > 0 && diff <= 7) {
    // 🟨 ใกล้เข้ามา (1-7 วัน) (สีเหลือง)
    return { status: 'warning', text: `อีก ${diff} วัน` };
  }
  if (diff > 7) {
    // 🟩 ยังไม่ถึง (ไกลกว่า 7 วัน) (สีเขียว)
    return { status: 'success', text: `อีก ${diff} วัน` };
  }

  // กรณีวันที่ผิดพลาด
  return { status: 'default', text: 'N/A' };
};
// 👆👆👆 (จบฟังก์ชันผู้ช่วย) 👆👆👆

const Easyevent = () => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [form] = Form.useForm(); // สร้าง Form instance
  const [modal, contextHolder] = Modal.useModal();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false); // เปลี่ยนชื่อ
  const [editingEvent, setEditingEvent] = useState(null); // <-- State ใหม่ ไว้เก็บ Event ที่กำลังแก้
  const location = useLocation();
  const { Panel } = Collapse;
  const [invitedEvents, setInvitedEvents] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [webhookOptions, setWebhookOptions] = useState([]);

  const fetchMyEvents = async () => {
    try {
      const { data } = await api.get('/api/events/myevents');
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events', error);
      if (error.response && error.response.status === 401) {
        logout();
      }
    }
  };

  const fetchInvitedEvents = async () => {
    try {
      const { data } = await api.get('/api/events/invited');
      setInvitedEvents(data);
    } catch (error) {
      console.error('Failed to fetch invited events', error);
    }
  };

  // --- Modal & Form Logic ---
  const showFormModal = (event = null) => {
    if (event) {
      // --- กำลัง "แก้ไข" (EDIT) ---
      setEditingEvent(event);
      // "เติม" ข้อมูลเก่าลงในฟอร์ม
      form.setFieldsValue({
        title: event.title,
        description: event.description,
        timeRange: [dayjs(event.startTime), dayjs(event.endTime)], // แปลง String เป็น Day.js
        guests: event.guests ? event.guests.join(', ') : '',
        webhookId: event.webhook || null,
        color: event.color || '#1890ff'
      });
    } else {
      // --- กำลัง "สร้างใหม่" (CREATE) ---
      setEditingEvent(null);
      form.resetFields(); // ล้างฟอร์ม
      form.setFieldsValue({ color: '#1890ff' });
    }
    setIsFormModalOpen(true); // เปิด Modal
  };

  // ฟังก์ชันปิด Modal
  const handleFormModalCancel = () => {
    setIsFormModalOpen(false);
    setEditingEvent(null); // ล้าง Event ที่กำลังแก้
  };

  const handleFormSubmit = async (values) => {
    try {
      // 1. ดึง String (guests) ออกมาจาก 'values'
      const { title, description, timeRange, guests, webhookId, color, eventType } = values;

      // 2. แปลง String ให้เป็น Array (เวอร์ชันปลอดภัย)
      const guestArray = (guests || "")
        .split(/[,\s;]+/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      // 3. เตรียมข้อมูลก้อนสุดท้าย
      const eventData = {
        title,
        description,
        startTime: timeRange[0].toDate(),
        endTime: timeRange[1].toDate(),
        guests: guestArray,
        webhookId: webhookId || null,
        color: (typeof color === 'string' ? color : color?.toHexString()) || '#1890ff',
        eventType: eventType
      };

      // 4. ยิง API (Create หรือ Update)
      if (editingEvent) {
        await api.put(`/api/events/${editingEvent._id}`, eventData);
        message.success('Event updated successfully');
      } else {
        await api.post('/api/events', eventData);
        message.success('Event created successfully');
      }

      // 5. ปิด Modal และ โหลดข้อมูลใหม่ (⭐️⭐️⭐️ แก้ไขแล้ว ⭐️⭐️⭐️)
      setIsFormModalOpen(false); // <-- (ผมแก้ Typo แล้ว!)
      setEditingEvent(null);

      // 6. โหลดข้อมูล
      fetchMyEvents();

    } catch (error) {
      console.error('Failed to submit form', error);
      message.error('Failed to save event.');
    }
  };

  const handleDelete = (eventId) => {
    // 1. เปลี่ยนจาก "Modal.confirm" (ตัวใหญ่)
    //    เป็น "modal.confirm" (ตัวเล็ก) ที่ได้มาจาก Hook

    modal.confirm({
      title: 'Are you sure you want to delete this event?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      onOk: async () => {
        try {
          await api.delete(`/api/events/${eventId}`);
          message.success('Event deleted successfully');
          fetchMyEvents();
        } catch (error) {
          console.error('Failed to delete event', error);
          message.error('Failed to delete event. You may not be the owner.');
        }
      },
    });
  };

  // 👇👇👇 2. อัปเกรดฟังก์ชัน "วาดปฏิทิน" 👇👇👇
  const dateCellRender = (value) => {
    // 'value' = คือ "วันที่" (Date cell) ... ที่ "กำลัง" (Currently) ... "วาด" (Rendering)

    // 1. (Logic "ใหม่" (New Logic))
    // "กรอง" (Filter) ... Event ... ที่ "ข้ามวัน" (Spanning)
    const listData = events.filter(event =>
      value.isSameOrAfter(dayjs(event.startTime), 'day') &&
      value.isSameOrBefore(dayjs(event.endTime), 'day')
    );

    // 2. (วาด "UI" (UI) ... (แบบ "Hybrid" (Hybrid)))
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {listData.map(item => {
          // (B. "คำนวณ "ตำแหน่ง"" (Calculate "Position") ... (เหมือนเดิม))
          const isStartDate = value.isSame(dayjs(item.startTime), 'day');
          const isEndDate = value.isSame(dayjs(item.endTime), 'day');
          const isMiddleDate = !isStartDate && !isEndDate;

          // --- 👇👇👇 (C. "เลือก "สี"" (Select "Color") ... (V6 - "ใหม่" (New))) 👇👇👇 ---
          const itemColor = item.color || '#1890ff'; // (อ่าน "สี" (Color) ... ที่ "บันทึก" (Saved) ... ไว้)

          // (สร้าง "สีจาง" (Light color) ... จาก "สีหลัก" (Main color))
          const bgColor = itemColor + '30'; // (Hex + 30% Alpha)
          const borderColor = itemColor; // (ใช้ "สีเต็ม" (Full color) ... เป็น "ขอบ" (Border))
          // --- 👆👆👆 (จบ "Logic สีใหม่" (New Color Logic)) 👆👆👆 ---

          // --- (D. "สร้าง "เนื้อหา" (Content) ... "สำหรับ" (For) ... "Popover") ---
          const owner = item.owner;
          const acceptedGuests = item.guests.filter(g => g.status === 'accepted');

          // (⭐️ "ซิงค์" (Sync) ... "สี" (Color) ... จาก "Setting" ... "ตรงนี้" (Here)!)
          const ownerAvatar = (
            <Avatar
              key={owner._id}
              style={{ backgroundColor: (owner.profileColor || '#1890ff') }} // 👈 (ใช้ "สี" (Color) ... ที่ "บันทึก" (Saved) ... ไว้)
            >
              {owner.name ? owner.name[0].toUpperCase() : 'O'}
            </Avatar>
          );

          const guestAvatars = acceptedGuests.map(g => (
            <Avatar key={g.email} style={{ backgroundColor: '#52c41a' }}>
              {g.email[0].toUpperCase()}
            </Avatar>
          ));

          const allAvatars = [ownerAvatar, ...guestAvatars];

          // (นี่คือ "กล่อง" (Box) ... ที่จะ "เด้ง" (Pop up) ... ออกมา)
          const popoverContent = (
            <div style={{ maxWidth: 300 }}>
              <Typography.Paragraph>
                <strong>Time:</strong> {`${dayjs(item.startTime).format('h:mm A')} - ${dayjs(item.endTime).format('h:mm A')}`}
              </Typography.Paragraph>
              <Typography.Paragraph>
                <strong>Owner:</strong> {owner.name}
              </Typography.Paragraph>
              <Typography.Paragraph style={{ marginBottom: 4 }}>
                <strong>Guests ({allAvatars.length}):</strong>
              </Typography.Paragraph>
              <Avatar.Group maxCount={5} size="small">
                {allAvatars}
              </Avatar.Group>
            </div>
          );
          // --- (จบ D. "สร้าง "เนื้อหา"") ---


          return (
            // --- (E. "หุ้ม" (Wrap) ... "แถบสี" (Bar) ... ด้วย "Popover") ---
            <Popover
              key={item._id}
              content={popoverContent} // ( "เนื้อหา" (Content) ... ที่จะ "โชว์" (Show))
              title={<Typography.Text strong>{item.title}</Typography.Text>} // ( "ชื่อ" (Title) ... ที่จะ "โชว์" (Show))
              trigger="click" // ( "เด้ง" (Pop up) ... "เมื่อ "คลิก"" (On "Click"))
            >
              {/* (นี่คือ "แถบสี" (Color Bar) ... "V4" ... (ที่ "สะอาด" (Clean))) */}
              <li
                style={{
                  backgroundColor: bgColor,
                  borderTop: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                  borderLeft: isStartDate ? `3px solid ${borderColor}` : `1px solid ${borderColor}`,
                  borderRight: isEndDate ? `3px solid ${borderColor}` : `1px solid ${borderColor}`,
                  ...(isMiddleDate && { borderLeft: 'none', borderRight: 'none' }),
                  padding: '0px 4px',
                  margin: '1px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  cursor: 'pointer' // (เปลี่ยน "เมาส์" (Mouse) ... เป็น "มือ" (Hand) ... (เพื่อ "บอก" (Tell) ... ว่า "คลิกได้" (Clickable)))
                }}
              >
                {/* (Logic การ "โชว์ "ชื่อ"" (Show "Title") ... "เหมือนเดิม" (Same as V4)) */}
                {isStartDate && (
                  <span>{item.title}</span>
                )}
                {isEndDate && !isStartDate && (
                  <span style={{ fontStyle: 'italic', color: '#888' }}>(End)</span>
                )}
                {isMiddleDate && (
                  <span>&nbsp;</span>
                )}
              </li>
            </Popover>
          );
        })}
      </ul>
    );
  };

  const handleRsvp = async (eventId, newStatus) => {
    try {
      await api.put(`/api/events/rsvp/${eventId}`, { status: newStatus });

      message.success(`Invitation ${newStatus}!`);

      fetchInvitedEvents();

      setPendingCount(prevCount => prevCount - 1);

      fetchMyEvents();

    } catch (error) {
      console.error('RSVP Failed:', error);
      message.error('Failed to respond to invitation.');
    }
  };

  useEffect(() => {

    const path = location.pathname;

    // (ถ้า URL คือ "/list" หรือ "/calendar" ... (หรือหน้าแรก "/Easyevent"))
    if (path.endsWith('/list') || path.endsWith('/calendar') || path === '/Easyevent') {
      fetchMyEvents();
    }
    else if (path.endsWith('/invited')) {
      fetchInvitedEvents();
    }
  }, [location.pathname]);

  const disabledDate = (current) => {
    // Can not select days before today and today
    return current && current < dayjs().startOf('day');
  };

  useEffect(() => {
    // (Job 1: นับคำเชิญ)
    const fetchPendingCount = async () => {
      try {
        const { data } = await api.get('/api/events/invited/count');
        setPendingCount(data.count);
      } catch (error) {
        console.error('Failed to fetch pending count', error);
      }
    };

    // (Job 2: ดึง "ตัวเลือก" Webhook ... (จาก "หน้า Setting"))
    const fetchWebhookOptions = async () => {
      try {
        // (ยิง API... (ที่เรา "สร้าง" (Built) ... ใน "ภารกิจที่ 5"))
        const { data } = await api.get('/api/webhooks');
        setWebhookOptions(data); // (บันทึก "ตัวเลือก" ... ลง State)
      } catch (error) {
        console.error('Failed to fetch webhook options', error);
      }
    };

    fetchPendingCount(); // (เรียก Job 1)
    fetchWebhookOptions(); // (เรียก Job 2)
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <Sider>
        <div style={{ color: 'white', padding: '16px', textAlign: 'center', fontSize: '18px' }}>
          EasyEvents
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
        >
          <Menu.Item
            key="/Easyevent/list" // (Key "ต้อง" ตรงกับ "path" (URL))
            icon={<UnorderedListOutlined />}
          >
            <Link to="/Easyevent/list">List View</Link>
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            key="/Easyevent/calendar"
            icon={<CalendarOutlined />}
          >
            <Link to="/Easyevent/calendar">Calendar View</Link>
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            key="/Easyevent/invited"
            icon={<MailOutlined />}
          >
            <Link to="/Easyevent/invited">
              <Space>
                Invited Events
                {pendingCount > 0 && (
                  <Badge count={pendingCount} size="small" />
                )}
              </Space>
            </Link>
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            key="/Easyevent/settings"
            icon={<SettingOutlined />}
          >
            <Link to="/Easyevent/settings">Settings</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Welcome, {user ? user.name : 'Guest'}!</Title>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={logout}>
            Logout
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>

            <Routes>
              {/* --- (1) หน้า List View (และ "หน้าแรก" (index)) --- */}
              <Route index element={
                <>
                  {/* (ย้าย "ปุ่ม Create" มาไว้ "ข้างใน" นี้) */}
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => showFormModal(null)}
                    style={{ marginBottom: 16 }}
                  >
                    Create New Event
                  </Button>
                  <List
                    header={<div>My Upcoming Events</div>}
                    bordered
                    dataSource={events.filter(item => !item.parentEvent)}
                    renderItem={(item) => {

                      // --- (A) เรียกใช้ฟังก์ชันผู้ช่วย (ใน renderItem) ---
                      const statusInfo = getEventStatus(item.startTime);
                      // (ดึงรายชื่อ "แขก" ที่ตอบรับแล้ว)
                      const acceptedGuests = item.guests.filter(g => g.status === 'accepted');

                      const mySubEvents = events.filter(e => e.parentEvent === item._id);

                      return (
                        <List.Item
                          actions={[
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => showFormModal(item)}
                            >
                              Edit
                            </Button>,
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDelete(item._id)}
                            >
                              Delete
                            </Button>
                          ]}
                        >
                          <Collapse ghost style={{ width: '100%' }}>
                            <Panel
                              header={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  {/* --- (ส่วนซ้าย: ชื่อ Event + Badge สถานะ) --- */}
                                  <Space direction="vertical" size={0}>
                                    <Link to={`/Easyevent/event/${item._id}`}>
                                      <Typography.Text strong style={{ fontSize: 16 }}>
                                        {item.title}
                                      </Typography.Text>
                                    </Link>
                                    <Badge
                                      status={statusInfo.status}
                                      text={statusInfo.text}
                                    />
                                  </Space>

                                  {/* --- 👇👇👇 (ส่วนขวา: Avatar Group ใหม่!) 👇👇👇 --- */}
                                  <div onClick={(e) => e.stopPropagation()}> {/* (กันไม่ให้คลิกแล้ว Collapse เด้ง) */}
                                    <Avatar.Group maxCount={4} size="small">
                                      {/* (1. Owner Avatar) */}
                                      <Tooltip title={`Owner: ${item.owner.name}`}>
                                        <Avatar
                                          style={{ backgroundColor: item.owner.profileColor || '#1890ff' }}
                                        >
                                          {item.owner.name ? item.owner.name[0].toUpperCase() : 'O'}
                                        </Avatar>
                                      </Tooltip>

                                      {/* (2. Guest Avatars) */}
                                      {acceptedGuests.map(g => {
                                        // (ดึงสี: ถ้ามี User Profile ใช้สีนั้น, ถ้าไม่มีใช้สีเขียว)
                                        const color = g.user ? g.user.profileColor : '#52c41a';
                                        const name = g.user ? g.user.name : g.email;

                                        return (
                                          <Tooltip key={g.email} title={name}>
                                            <Avatar
                                              style={{ backgroundColor: color }}
                                            >
                                              {name[0].toUpperCase()}
                                            </Avatar>
                                          </Tooltip>
                                        );
                                      })}
                                    </Avatar.Group>
                                  </div>
                                  {/* --- 👆👆👆 (จบส่วน Avatar) 👆👆👆 --- */}
                                </div>
                              }
                              key={item._id}
                            >
                              {/* --- (นี่คือ "เนื้อหา" ที่อัปเกรดแล้ว) --- */}
                              <Typography.Paragraph>
                                <strong>Description:</strong> {item.description || 'No description provided.'}
                              </Typography.Paragraph>

                              {/* (A) แสดง "ผู้สร้าง" (Owner) */}
                              <Typography.Paragraph>
                                <strong>Owner:</strong> {item.owner.name}
                              </Typography.Paragraph>

                              {/* (B) แสดง "แขก" (Guests) */}
                              <Typography.Paragraph>
                                <strong>Guests ({acceptedGuests.length}):</strong>
                                <br />
                                {acceptedGuests.length > 0
                                  ? acceptedGuests.map(g => (
                                    <Tag icon={<UserOutlined />} key={g.email} style={{ marginTop: 4 }}>
                                      {g.email}
                                    </Tag>
                                  ))
                                  : 'No guests have accepted yet.'
                                }
                              </Typography.Paragraph>

                              {mySubEvents.length > 0 && (
                                <div style={{ marginTop: 16, padding: '12px', background: '#f9f9f9', borderRadius: 8 }}>
                                  <Typography.Text strong type="secondary">📅 Itinerary / Sub-events:</Typography.Text>
                                  <List
                                    size="small"
                                    dataSource={mySubEvents}
                                    renderItem={sub => (
                                      <List.Item>
                                        <List.Item.Meta
                                          avatar={<Badge status="processing" color={sub.color} />}
                                          title={
                                            <Link to={`/Easyevent/event/${sub._id}`} style={{ fontSize: 13 }}>
                                              {sub.title}
                                            </Link>
                                          }
                                          description={
                                            <span style={{ fontSize: 12 }}>
                                              {dayjs(sub.startTime).format('MMM D, HH:mm')} - {dayjs(sub.endTime).format('HH:mm')}
                                            </span>
                                          }
                                        />
                                      </List.Item>
                                    )}
                                  />
                                </div>
                              )}

                              <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />

                              <Typography.Text type="secondary">
                                {`Starts: ${new Date(item.startTime).toLocaleString()}`}
                              </Typography.Text>
                              <Typography.Text type="secondary" style={{ display: 'block' }}>
                                {`Ends: ${new Date(item.endTime).toLocaleString()}`}
                              </Typography.Text>
                            </Panel>
                          </Collapse>
                        </List.Item>
                      );
                    }}
                  />
                </>
              } />
              <Route path="list" element={
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => showFormModal(null)}
                    style={{ marginBottom: 16 }}
                  >
                    Create New Event
                  </Button>
                  <List
                    header={<div>My Upcoming Events</div>}
                    bordered
                    dataSource={events.filter(item => !item.parentEvent)}
                    renderItem={(item) => {

                      // --- (A) เรียกใช้ฟังก์ชันผู้ช่วย (ใน renderItem) ---
                      const statusInfo = getEventStatus(item.startTime);
                      // (ดึงรายชื่อ "แขก" ที่ตอบรับแล้ว)
                      const acceptedGuests = item.guests.filter(g => g.status === 'accepted');

                      return (
                        <List.Item
                          actions={[
                            <Link to={`/Easyevent/event/${item._id}`}>
                              <Button
                                type="text"
                                icon={<InfoCircleOutlined />}
                                style={{ color: '#1890ff' }} // (สีฟ้า (Blue) ... (เพื่อให้ "เด่น" (Stand out)))
                              >
                                View
                              </Button>
                            </Link>,
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => showFormModal(item)}
                            >
                              Edit
                            </Button>,
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDelete(item._id)}
                            >
                              Delete
                            </Button>
                          ]}
                        >
                          <Collapse ghost style={{ width: '100%' }}>
                            <Panel
                              header={
                                <Space direction="vertical" size={0}>
                                  <Typography.Text strong>{item.title}</Typography.Text>
                                  {/* --- (B) ใช้ "status" (สี) และ "text" (ข้อความ) ที่คำนวณได้ --- */}
                                  <Badge
                                    status={statusInfo.status}
                                    text={statusInfo.text}
                                  />

                                </Space>
                              }
                              key={item._id}
                            >
                              {/* --- (นี่คือ "เนื้อหา" ที่อัปเกรดแล้ว) --- */}
                              <Typography.Paragraph>
                                <strong>Description:</strong> {item.description || 'No description provided.'}
                              </Typography.Paragraph>

                              {/* (A) แสดง "ผู้สร้าง" (Owner) */}
                              <Typography.Paragraph>
                                <strong>Owner:</strong> {item.owner.name}
                              </Typography.Paragraph>

                              {/* (B) แสดง "แขก" (Guests) */}
                              <Typography.Paragraph>
                                <strong>Guests ({acceptedGuests.length}):</strong>
                                <br />
                                {acceptedGuests.length > 0
                                  ? acceptedGuests.map(g => (
                                    <Tag icon={<UserOutlined />} key={g.email} style={{ marginTop: 4 }}>
                                      {g.email}
                                    </Tag>
                                  ))
                                  : 'No guests have accepted yet.'
                                }
                              </Typography.Paragraph>

                              <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />

                              <Typography.Text type="secondary">
                                {`Starts: ${new Date(item.startTime).toLocaleString()}`}
                              </Typography.Text>
                              <Typography.Text type="secondary" style={{ display: 'block' }}>
                                {`Ends: ${new Date(item.endTime).toLocaleString()}`}
                              </Typography.Text>
                            </Panel>
                          </Collapse>
                        </List.Item>
                      );
                    }}
                  />

                </>
              } />
              <Route path="calendar" element={
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                  <Calendar dateCellRender={dateCellRender} />
                </div>
              } />
              <Route path="invited" element={
                <List
                  header={<div>Events You're Invited To (Pending)</div>}
                  bordered
                  dataSource={invitedEvents}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={() => handleRsvp(item._id, 'accepted')}
                        >
                          Accept
                        </Button>,
                        <Button
                          danger
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => handleRsvp(item._id, 'rejected')}
                        >
                          Reject
                        </Button>
                      ]}

                    >
                      <List.Item.Meta
                        title={item.title}
                        description={
                          `Organized by: ${item.owner.name} (${item.owner.email})`
                        }
                      />
                      <Badge
                        status={getEventStatus(item.startTime).status}
                        text={getEventStatus(item.startTime).text}
                      />
                    </List.Item>
                  )}
                />
              } />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="event/:id" element={<EventDetailsPage />} />

            </Routes>
          </div>
        </Content>
      </Layout>

      {/* --- Modal (สำหรับ Create และ Edit) --- */}
      <Modal
        title={editingEvent ? 'Edit Event' : 'Create New Event'}
        open={isFormModalOpen}
        onOk={() => form.submit()}
        onCancel={handleFormModalCancel}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="eventType" label="Event Type" initialValue="quick">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="quick">Quick Event (ครั้งเดียวจบ)</Radio.Button>
              <Radio.Button value="project">Project / Trip (กิจกรรมต่อเนื่อง)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="timeRange" label="Time" rules={[{ required: true }]}>
            <RangePicker 
                showTime 
                format="YYYY-MM-DD HH:mm" 
                disabledDate={disabledDate} 
            />
          </Form.Item>

          <Form.Item
            name="color"
            label="Event Color"
          >
            <ColorPicker showText />
          </Form.Item>

          <Form.Item
            name="webhookId" // <-- ⭐️ (1. เปลี่ยน "name")
            label="Notification Channel (Optional)"
            tooltip={`เลือก Channel ที่จะ "แจ้งเตือน" (Notify) ... (ถ้า "เว้นว่าง" (Blank) ... = ไม่แจ้งเตือน)`}
          >
            <Select
              placeholder="Don't notify"
              allowClear
            >
              {webhookOptions.map(wh => (
                <Select.Option key={wh._id} value={wh._id}>
                  {wh.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="guests"
            label="Invite Guests (by Email)"
            tooltip="Separate emails with a comma (,) or a space."
          >
            <Input.TextArea
              rows={2}
              placeholder="e.g. friend1@example.com, friend2@example.com"
            />
          </Form.Item>

        </Form>

      </Modal>
    </Layout>
  );
};

export default Easyevent;