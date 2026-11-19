const supabase = require('../lib/supabase');

const COLUMNS = 'id, title, venue, starts_at, price';
const EDITABLE_FIELDS = ['title', 'venue', 'starts_at', 'price'];

// 공연 ID 검증: 양의 정수만 허용
function parseId(value) {
  if (!/^\d+$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidDate(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isValidPrice(value) {
  return Number.isInteger(value) && value >= 0;
}

// 필드별 검증 메시지 반환 (문제가 없으면 null)
function validateField(field, value) {
  if (field === 'title' || field === 'venue') {
    return isNonEmptyString(value) ? null : `${field}는 빈 값이 아닌 문자열이어야 합니다.`;
  }
  if (field === 'starts_at') {
    return isValidDate(value) ? null : 'starts_at은 올바른 날짜 형식이어야 합니다.';
  }
  if (field === 'price') {
    return isValidPrice(value) ? null : 'price는 0 이상의 정수여야 합니다.';
  }
  return null;
}

// [과제 1] 공연 목록 조회
async function getPerformances(req, res, next) {
  try {
    // TODO 1-1. performances 테이블에서 모든 데이터 조회
    // TODO 1-2. id 기준 오름차순 정렬
    const { data, error } = await supabase
      .from('performances')
      .select(COLUMNS)
      .order('id', { ascending: true });

    if (error) throw error;

    // TODO 1-3. 조회 결과를 JSON으로 응답 (데이터가 없으면 빈 배열)
    return res.json(data || []);
  } catch (error) {
    next(error);
  }
}

// [선택 1] 특정 공연 상세 조회
async function getPerformanceById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: '공연 ID는 양의 정수여야 합니다.' });
    }

    const { data, error } = await supabase
      .from('performances')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '공연을 찾을 수 없습니다.' });
    }

    return res.json(data);
  } catch (error) {
    next(error);
  }
}

// [과제 2] 공연 등록
async function createPerformance(req, res, next) {
  try {
    // TODO 2-1. 요청 Body에서 공연 정보 가져오기
    const { title, venue, starts_at, price } = req.body || {};

    // TODO 2-2. 필수값 확인
    if (title === undefined || venue === undefined || starts_at === undefined || price === undefined) {
      return res.status(400).json({
        error: 'title, venue, starts_at, price는 모두 필수입니다.',
      });
    }

    for (const [field, value] of Object.entries({ title, venue, starts_at, price })) {
      const message = validateField(field, value);
      if (message) return res.status(400).json({ error: message });
    }

    // TODO 2-3. Supabase에 데이터 등록
    const { data, error } = await supabase
      .from('performances')
      .insert({ title: title.trim(), venue: venue.trim(), starts_at, price })
      .select(COLUMNS)
      .single();

    if (error) throw error;

    // TODO 2-4. 등록 결과 반환
    return res.status(201).json({
      message: '공연 등록 완료',
      performance: data,
    });
  } catch (error) {
    next(error);
  }
}

// [과제 3] 공연 수정
async function updatePerformance(req, res, next) {
  try {
    // TODO 3-1. 요청 URL에서 id 가져오기
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: '공연 ID는 양의 정수여야 합니다.' });
    }

    // TODO 3-2. 수정할 공연 정보 가져오기 (수정 가능한 컬럼만)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    // TODO 3-3. 입력값 검증
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: '수정할 항목(title, venue, starts_at, price)을 하나 이상 입력해 주세요.',
      });
    }

    for (const [field, value] of Object.entries(updates)) {
      const message = validateField(field, value);
      if (message) return res.status(400).json({ error: message });
    }
    if (updates.title) updates.title = updates.title.trim();
    if (updates.venue) updates.venue = updates.venue.trim();

    // TODO 3-4. Supabase 데이터 수정
    const { data, error } = await supabase
      .from('performances')
      .update(updates)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '공연을 찾을 수 없습니다.' });
    }

    // TODO 3-5. 수정 결과 반환
    return res.json({
      message: '공연 수정 완료',
      performance: data,
    });
  } catch (error) {
    next(error);
  }
}

// [과제 4] 공연 삭제
async function deletePerformance(req, res, next) {
  try {
    // TODO 4-1. 요청 URL에서 id 가져오기
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: '공연 ID는 양의 정수여야 합니다.' });
    }

    // TODO 4-2. Supabase 데이터 삭제
    const { data, error } = await supabase
      .from('performances')
      .delete()
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '공연을 찾을 수 없습니다.' });
    }

    // TODO 4-3. 삭제 결과 반환
    return res.json({ message: '공연 삭제 완료' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPerformances,
  getPerformanceById,
  createPerformance,
  updatePerformance,
  deletePerformance,
};
